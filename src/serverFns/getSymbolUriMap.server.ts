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
    if (!data.uris.length) return {};

    const floDownBlocks = await prisma.floDownBlock.findMany({
      // Remaining issue: scans every non-discarded FloDown block. Fine for small DBs; not keyed
      // by export identity or URI index. Preview hover is the remaining caller.
      where: { status: { not: "DISCARDED" } },
      select: {
        statement: true,
        declaredSymbolsInfo: true,
        futureRepo: true,
        filePath: true,
        fileName: true,
        language: true,
      },
    });

    const result: Record<string, DefiningDefinition> = {};
    const remaining = new Set(data.uris.filter((uri) => uri.trim()));

    for (const row of floDownBlocks) {
      if (!remaining.size) break;

      const root = normalizeToRoot(assertFloDownStatement(row.statement));
      const definition = root.content.find(isDefinitionNode);
      if (!definition) continue;

      const info = parseDeclaredSymbolsInfo(row.declaredSymbolsInfo);
      const declaredSymbols = info.map((item) => item.symbolUri);
      const declaredNames = info.map((item) => item.symbolName);

      for (const item of info) {
        if (remaining.has(item.symbolUri)) {
          result[item.symbolUri] = {
            definition,
            declaredSymbols,
            declaredNames,
            futureRepo: row.futureRepo,
            filePath: row.filePath,
            fileName: row.fileName,
            language: row.language,
          };
          remaining.delete(item.symbolUri);
        }
      }
    }

    return result;
  });
