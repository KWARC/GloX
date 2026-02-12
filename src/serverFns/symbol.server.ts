import prisma from "@/lib/prisma";
import { insertDefiniendum } from "@/server/ftml/astOperations";
import {
  assertFtmlStatement,
  DefinitionNode,
  FtmlNode,
  normalizeToRoot,
  ParagraphNode,
  RootNode,
  unwrapRoot,
} from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

export type CreateSymbolDefiniendumInput = {
  definitionId: string;
  selectedText: string;
  symdecl: boolean;

  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;

  symbolName: string;
  alias?: string | null;

  selectedSymbolSource?: "DB" | "MATHHUB";
  selectedSymbolId?: string;
  selectedSymbolUri?: string;
};

function isDefinitionNode(node: unknown): node is DefinitionNode {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as FtmlNode).type === "definition"
  );
}

function isParagraphNode(node: unknown): node is ParagraphNode {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as FtmlNode).type === "paragraph"
  );
}

export const createSymbolDefiniendum = createServerFn({ method: "POST" })
  .inputValidator((data: CreateSymbolDefiniendumInput) => data)
  .handler(async ({ data }) => {
    return prisma.$transaction(async (tx) => {
      const {
        definitionId,
        selectedText,
        symdecl,
        futureRepo,
        filePath,
        fileName,
        language,
        symbolName,
        alias,
        selectedSymbolSource,
        selectedSymbolId,
        selectedSymbolUri,
      } = data;

      if (!definitionId || !selectedText.trim()) {
        throw new Error("Invalid input");
      }

      const definition = await tx.definition.findUnique({
        where: { id: definitionId },
      });

      if (!definition?.statement) {
        throw new Error("Definition not found");
      }

      let uri: string;
      if (symdecl) {
        if (!symbolName.trim()) {
          throw new Error("Symbol name required");
        }

        await tx.symbol.create({
          data: {
            symbolName: symbolName.trim(),
            alias: alias?.trim() || null,
            futureRepo: futureRepo.trim(),
            filePath: filePath.trim(),
            fileName: fileName.trim(),
            language: language.trim(),
          },
        });

        uri = symbolName.trim();
      } else {
        if (!selectedSymbolSource) {
          throw new Error("Symbol source required");
        }

        if (selectedSymbolSource === "DB") {
          if (!selectedSymbolId) {
            throw new Error("selectedSymbolId required");
          }

          const existing = await tx.symbol.findUnique({
            where: { id: selectedSymbolId },
          });

          if (!existing) {
            throw new Error("Symbol not found");
          }

          uri = existing.symbolName;
        } else {
          if (!selectedSymbolUri) {
            throw new Error("selectedSymbolUri required");
          }

          uri = selectedSymbolUri;
        }
      }

      const root: RootNode = normalizeToRoot(
        assertFtmlStatement(definition.statement),
      );

      const firstNode = root.content[0];

      if (!isDefinitionNode(firstNode)) {
        throw new Error("Expected definition node at root");
      }

      const definitionNode = firstNode;

      const firstContent = definitionNode.content?.[0];

      if (!isParagraphNode(firstContent)) {
        throw new Error("Expected paragraph node inside definition");
      }

      const paragraphNode = firstContent;

      const updatedContent = insertDefiniendum(
        paragraphNode.content,
        selectedText,
        () => ({
          type: "definiendum",
          uri,
          content: [alias || selectedText],
          symdecl,
        }),
      );

      definitionNode.content = [
        {
          ...paragraphNode,
          content: updatedContent,
        },
      ];

      if (symdecl) {
        const existing = definitionNode.for_symbols ?? [];
        if (!existing.includes(uri)) {
          definitionNode.for_symbols = [...existing, uri];
        }
      }

      await tx.definition.update({
        where: { id: definitionId },
        data: {
          statement: JSON.parse(JSON.stringify(unwrapRoot(root))),
        },
      });

      return { ok: true };
    });
  });

export const searchSymbol = createServerFn({ method: "POST" })
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => {
    return prisma.symbol.findMany({
      where: {
        symbolName: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });
  });
