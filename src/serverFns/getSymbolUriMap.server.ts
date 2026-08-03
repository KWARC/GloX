import prisma from "@/lib/prisma";
import {
  assertFtmlStatement,
  DefinitionNode,
  isDefinitionNode,
  normalizeToRoot,
} from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

export type DefiningDefinition = {
  definition: DefinitionNode;
  declaredSymbols: string[];
};

export const getDefiningDefinitions = createServerFn({ method: "POST" })
  .inputValidator((data: { labels: string[] }) => data)
  .handler(async ({ data }): Promise<Record<string, DefiningDefinition>> => {
    if (!data.labels.length) return {};

    const floDownBlocks = await prisma.floDownBlock.findMany({
      where: { status: { not: "DISCARDED" } },
      select: { statement: true, declaredSymbols: true },
    });

    const result: Record<string, DefiningDefinition> = {};
    const remaining = new Set(data.labels);

    for (const row of floDownBlocks) {
      if (!remaining.size) break;

      const root = normalizeToRoot(assertFtmlStatement(row.statement));
      const definition = root.content.find(isDefinitionNode);
      if (!definition) continue;

      for (const label of row.declaredSymbols) {
        if (remaining.has(label)) {
          result[label] = {
            definition,
            declaredSymbols: row.declaredSymbols,
          };
          remaining.delete(label);
        }
      }
    }

    return result;
  });
