import prisma from "@/lib/prisma";
import { insertDefiniendum } from "@/server/ftml/astOperations";
import { parseUri } from "@/server/parseUri";
import {
  assertFtmlStatement,
  DefiniendumNode,
  DefinitionNode,
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

      if (!definitionId || !selectedText.trim())
        throw new Error("Invalid input");

      const definition = await tx.definition.findUnique({
        where: { id: definitionId },
      });

      if (!definition) throw new Error("Definition not found");

      if (!definition.statement)
        throw new Error("Definition has no FTML statement");

      let symbol: {
        id: string;
        symbolName: string;
        alias: string | null;
        resolvedUri: string | null;
      };

      let resolvedUri: string;

      if (symdecl) {
        if (!symbolName.trim()) throw new Error("Symbol name required");

        symbol = await tx.symbol.create({
          data: {
            symbolName: symbolName.trim(),
            alias: alias?.trim() || null,
            futureRepo: futureRepo.trim(),
            filePath: filePath.trim(),
            fileName: fileName.trim(),
            language: language.trim(),
          },
        });

        resolvedUri = symbol.symbolName;
      }

      else {
        if (!selectedSymbolSource) throw new Error("Symbol source required");

        if (selectedSymbolSource === "DB") {
          if (!selectedSymbolId) throw new Error("selectedSymbolId required");

          const existing = await tx.symbol.findUnique({
            where: { id: selectedSymbolId },
          });

          if (!existing) throw new Error("Symbol not found");

          symbol = existing;
          resolvedUri = existing.resolvedUri || existing.symbolName;
        } else {
          if (!selectedSymbolUri) throw new Error("selectedSymbolUri required");

          const parsed = parseUri(selectedSymbolUri);

          const existing = await tx.symbol.findFirst({
            where: { resolvedUri: parsed.conceptUri },
          });

          symbol =
            existing ??
            (await tx.symbol.create({
              data: {
                symbolName: parsed.symbol,
                futureRepo: parsed.archive,
                filePath: parsed.filePath,
                fileName: parsed.fileName,
                language: parsed.language,
                resolvedUri: parsed.conceptUri,
              },
            }));

          resolvedUri = parsed.conceptUri;
        }
      }

      await tx.definitionSymbol.create({
        data: {
          definitionId,
          symbolId: symbol.id,
          isDeclared: symdecl,
        },
      });

      const currentAst: RootNode = normalizeToRoot(
        assertFtmlStatement(definition.statement),
      );

      const createNode = (): DefiniendumNode => ({
        type: "definiendum",
        uri: resolvedUri,
        content: [symbol.alias || selectedText],
        symdecl,
      });

      const paragraph = currentAst.content[0] as ParagraphNode;

      const updatedContent = insertDefiniendum(
        paragraph.content,
        selectedText,
        createNode,
      );

      const definitionNode: DefinitionNode = {
        type: "definition",
        for_symbols: symdecl ? [resolvedUri] : [],
        content: [
          {
            type: "paragraph",
            content: updatedContent,
          },
        ],
      };

      const updatedAst: RootNode = {
        ...currentAst,
        content: [definitionNode],
      };

      await tx.definition.update({
        where: { id: definitionId },
        data: {
          statement: JSON.parse(JSON.stringify(unwrapRoot(updatedAst))),
        },
      });

      return {
        symbolId: symbol.id,
        uri: resolvedUri,
        symdecl,
      };
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
