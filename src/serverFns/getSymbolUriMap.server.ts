import prisma from "@/lib/prisma";
import { requireUserId } from "@/server/auth/requireUser";
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
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const getDefiningDefinitions = createServerFn({ method: "POST" })
  .inputValidator((data: { labels: string[] }) => data)
  .handler(async ({ data }): Promise<Record<string, DefiningDefinition>> => {
    await requireUserId();
    if (!data.labels.length) return {};

    const floDownBlocks = await prisma.floDownBlock.findMany({
      // Remaining issue: scans every non-discarded FloDown block. Fine for small DBs; not keyed
      // by export identity or label index. Preview hover is the remaining caller.
      where: { status: { not: "DISCARDED" } },
      select: {
        statement: true,
        declaredSymbols: true,
        futureRepo: true,
        filePath: true,
        fileName: true,
        language: true,
      },
    });

    const result: Record<string, DefiningDefinition> = {};
    const remaining = new Set(data.labels);

    for (const row of floDownBlocks) {
      if (!remaining.size) break;

      const root = normalizeToRoot(assertFloDownStatement(row.statement));
      const definition = root.content.find(isDefinitionNode);
      if (!definition) continue;

      for (const label of row.declaredSymbols) {
        if (remaining.has(label)) {
          result[label] = {
            definition,
            declaredSymbols: row.declaredSymbols,
            futureRepo: row.futureRepo,
            filePath: row.filePath,
            fileName: row.fileName,
            language: row.language,
          };
          remaining.delete(label);
        }
      }
    }

    return result;
  });
