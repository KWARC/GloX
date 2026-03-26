import prisma from "@/lib/prisma";
import {
  assertFtmlStatement,
  DefinitionNode,
  FtmlContent,
  FtmlNode,
  isDefiniendumNode,
  isDefinitionNode,
  normalizeToRoot,
} from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

function collectDeclaredLabels(
  node: FtmlNode | FtmlContent,
  acc: Set<string>,
): void {
  if (typeof node === "string") return;

  if (isDefiniendumNode(node) && node.symdecl === true && node.uri) {
    acc.add(node.uri);
  }

  if (node.content) {
    for (const child of node.content) {
      collectDeclaredLabels(child, acc);
    }
  }
}

export const getDefiningDefinitions = createServerFn({ method: "POST" })
  .inputValidator((data: { labels: string[] }) => data)
  .handler(async ({ data }): Promise<Record<string, DefinitionNode>> => {
    if (!data.labels.length) return {};

    const definitions = await prisma.definition.findMany({
      where: { status: { not: "DISCARDED" } },
      select: { statement: true },
    });

    const result: Record<string, DefinitionNode> = {};
    const remaining = new Set(data.labels);

    for (const def of definitions) {
      if (!remaining.size) break;

      const root = normalizeToRoot(assertFtmlStatement(def.statement));

      for (const block of root.content) {
        if (!isDefinitionNode(block)) continue;

        const declared = new Set<string>();
        collectDeclaredLabels(block, declared);

        for (const label of declared) {
          if (remaining.has(label)) {
            result[label] = block;
            remaining.delete(label);
          }
        }
      }
    }

    return result;
  });
