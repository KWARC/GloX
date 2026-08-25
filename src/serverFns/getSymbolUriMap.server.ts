import prisma from "@/lib/prisma";
import { requireUserId } from "@/server/auth/requireUser";
import { parseDeclaredSymbolsInfo } from "@/server/declaredSymbolsInfo";
import {
  assertFloDownStatement,
  DefinitionNode,
  isDefinitionNode,
  normalizeToRoot,
} from "@/types/floDown.types";
import { createServerFn } from "@tanstack/react-start";

export type DefiningDefinition = {
  definition: DefinitionNode;
  declaredSymbols: string[];
  declaredNames: string[];
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const getDefiningDefinitions = createServerFn({ method: "POST" })
  .inputValidator((data: { uris: string[] }) => data)
  .handler(async ({ data }): Promise<Record<string, DefiningDefinition>> => {
    await requireUserId();
    const wanted = [...new Set(data.uris.map((uri) => uri.trim()).filter(Boolean))];
    if (!wanted.length) return {};

    const remaining = new Set(wanted);

    const catalogRows = await prisma.floDownBlock.findMany({
      where: { status: { not: "DISCARDED" } },
      select: {
        id: true,
        declaredSymbolsInfo: true,
        futureRepo: true,
        filePath: true,
        fileName: true,
        language: true,
      },
    });

    const matched: Array<{
      id: string;
      uris: string[];
      declaredSymbols: string[];
      declaredNames: string[];
      futureRepo: string;
      filePath: string;
      fileName: string;
      language: string;
    }> = [];

    for (const row of catalogRows) {
      if (!remaining.size) break;
      const info = parseDeclaredSymbolsInfo(row.declaredSymbolsInfo);
      const hitUris = info
        .map((item) => item.symbolUri)
        .filter((uri) => remaining.has(uri));
      if (hitUris.length === 0) continue;
      matched.push({
        id: row.id,
        uris: hitUris,
        declaredSymbols: info.map((item) => item.symbolUri),
        declaredNames: info.map((item) => item.symbolName),
        futureRepo: row.futureRepo,
        filePath: row.filePath,
        fileName: row.fileName,
        language: row.language,
      });
      for (const uri of hitUris) remaining.delete(uri);
    }

    if (matched.length === 0) return {};

    const statements = await prisma.floDownBlock.findMany({
      where: { id: { in: matched.map((row) => row.id) } },
      select: { id: true, statement: true },
    });
    const statementById = new Map(
      statements.map((row) => [row.id, row.statement]),
    );

    const result: Record<string, DefiningDefinition> = {};
    for (const row of matched) {
      const statement = statementById.get(row.id);
      if (!statement) continue;
      const root = normalizeToRoot(assertFloDownStatement(statement));
      const definition = root.content.find(isDefinitionNode);
      if (!definition) continue;
      const found: DefiningDefinition = {
        definition,
        declaredSymbols: row.declaredSymbols,
        declaredNames: row.declaredNames,
        futureRepo: row.futureRepo,
        filePath: row.filePath,
        fileName: row.fileName,
        language: row.language,
      };
      for (const uri of row.uris) {
        result[uri] = found;
      }
    }

    return result;
  });
