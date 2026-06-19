import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  findAllTextOccurrences,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import {
  assertFtmlStatement,
  DefiniendumNode,
  DefinitionNode,
  FtmlStatement,
  isDefinitionNode,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

export type CreateDefinitionWithDeclaredSymbolInput = {
  documentId: string;
  documentPageId?: string | null;
  pageNumber?: number | null;
  definitionName: string;
  definitionText: string;
  symbolName: string;
  futureRepo: string;
  filePath: string;
  language: string;
};

export type CreatedSymbolTarget = {
  definition: {
    id: string;
    pageNumber: number | null;
    statement: FtmlStatement;
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  };
  symbol: {
    id: string;
    symbolName: string;
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  };
};

function buildPlainDefinitionStatement(definitionText: string): DefinitionNode {
  return {
    type: "definition",
    for_symbols: [],
    content: [
      {
        type: "paragraph",
        content: [definitionText],
      },
    ],
  };
}

export const createDefinitionWithDeclaredSymbol = createServerFn({
  method: "POST",
})
  .inputValidator((data: CreateDefinitionWithDeclaredSymbolInput) => data)
  .handler(async ({ data }) => {
    const definitionName = data.definitionName?.trim();
    const definitionText = data.definitionText?.trim();
    const symbolName = data.symbolName?.trim();
    const futureRepo = data.futureRepo?.trim();
    const filePath = data.filePath?.trim();
    const language = data.language?.trim();

    if (
      !data.documentId ||
      !definitionName ||
      !definitionText ||
      !symbolName ||
      !futureRepo ||
      !filePath ||
      !language
    ) {
      throw new Error("Missing symbol-target definition fields");
    }

    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const userId = userRes.user.id;

    const documentPageId =
      data.documentPageId ??
      (
        await prisma.documentPage.findFirst({
          where: { documentId: data.documentId },
          orderBy: { pageNumber: "asc" },
          select: { id: true },
        })
      )?.id;

    if (!documentPageId) {
      throw new Error("Document has no pages");
    }

    const statement = buildPlainDefinitionStatement(definitionText);
    const serializedStatement = JSON.parse(JSON.stringify(statement));

    const result = await prisma.$transaction(async (tx) => {
      const symbol = await tx.symbol.upsert({
        where: {
          symbolName_futureRepo_filePath_fileName_language: {
            symbolName,
            futureRepo,
            filePath,
            fileName: definitionName,
            language,
          },
        },
        update: {},
        create: {
          symbolName,
          futureRepo,
          filePath,
          fileName: definitionName,
          language,
        },
      });

      const createdDefinition = await tx.definition.create({
        data: {
          documentId: data.documentId,
          documentPageId,
          pageNumber: null,
          originalText: definitionText,
          statement: serializedStatement,
          futureRepo,
          filePath,
          fileName: definitionName,
          language,
          createdById: userId,
          updatedById: userId,
          currentVersion: 1,
          status: "EXTRACTED",
        },
      });

      await tx.definitionVersion.create({
        data: {
          definitionId: createdDefinition.id,
          versionNumber: 1,
          originalText: definitionText,
          statement: serializedStatement,
          editedById: userId,
        },
      });

      await tx.document.update({
        where: { id: data.documentId },
        data: { status: "TEXT_EXTRACTED" },
      });

      return {
        definition: {
          id: createdDefinition.id,
          pageNumber: createdDefinition.pageNumber,
          statement: assertFtmlStatement(createdDefinition.statement),
          futureRepo: createdDefinition.futureRepo,
          filePath: createdDefinition.filePath,
          fileName: createdDefinition.fileName,
          language: createdDefinition.language,
        },
        symbol: {
          id: symbol.id,
          symbolName: symbol.symbolName,
          futureRepo: symbol.futureRepo,
          filePath: symbol.filePath,
          fileName: symbol.fileName,
          language: symbol.language,
        },
      } satisfies CreatedSymbolTarget;
    });

    return result;
  });

export type DeclareCreatedSymbolDefiniendumInput = {
  definitionId: string;
  symbolId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
};

export const declareCreatedSymbolDefiniendum = createServerFn({
  method: "POST",
})
  .inputValidator((data: DeclareCreatedSymbolDefiniendumInput) => data)
  .handler(async ({ data }) => {
    const selectedText = data.selectedText?.trim();

    if (
      !data.definitionId ||
      !data.symbolId ||
      !selectedText ||
      data.startOffset < 0 ||
      data.endOffset <= data.startOffset
    ) {
      throw new Error("Invalid declared definiendum fields");
    }

    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const userId = userRes.user.id;

    await prisma.$transaction(async (tx) => {
      const [definition, symbol] = await Promise.all([
        tx.definition.findUnique({ where: { id: data.definitionId } }),
        tx.symbol.findUnique({ where: { id: data.symbolId } }),
      ]);

      if (!definition?.statement) {
        throw new Error("Content not found");
      }

      if (!symbol) {
        throw new Error("Symbol not found");
      }

      const root = normalizeToRoot(assertFtmlStatement(definition.statement));
      const occurrences = findAllTextOccurrences(root, selectedText);
      const location = occurrences.find(
        (loc) => loc.offset === data.startOffset,
      );

      if (!location) {
        throw new Error("Exact selection match not found in AST");
      }

      const targetPath = [location.paragraphIndex, location.contentIndex];
      if (pathTraversesSemanticNode(root, targetPath)) {
        throw new Error(
          "Cannot insert definiendum inside existing semantic node",
        );
      }

      const definiendumNode: DefiniendumNode = {
        type: "definiendum",
        uri: symbol.symbolName,
        content: [selectedText],
        symdecl: true,
      };

      const updatedRoot = replaceTextWithNode(
        root,
        location,
        data.startOffset,
        data.endOffset,
        definiendumNode,
      );

      const updatedDefinition = updatedRoot.content.find(isDefinitionNode);
      if (!updatedDefinition) {
        throw new Error("Content not found after update");
      }

      const existingSymbols = updatedDefinition.for_symbols ?? [];
      if (!existingSymbols.includes(symbol.symbolName)) {
        updatedDefinition.for_symbols = [...existingSymbols, symbol.symbolName];
      }

      const nextVersion = definition.currentVersion + 1;
      const statement = JSON.parse(JSON.stringify(unwrapRoot(updatedRoot)));

      await tx.definitionVersion.create({
        data: {
          definitionId: definition.id,
          versionNumber: nextVersion,
          originalText: definition.originalText,
          statement,
          editedById: userId,
        },
      });

      await tx.definition.update({
        where: { id: definition.id },
        data: {
          statement,
          updatedById: userId,
          currentVersion: nextVersion,
        },
      });
    });

    return { ok: true };
  });
