import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  findAllTextOccurrences,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import {
  assertFloDownStatement,
  DefiniendumNode,
  DefinitionNode,
  FloDownStatement,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/floDown.types";
import { addDeclaredSymbol } from "@/server/floDownBlockDeclaredSymbols";
import { sanitizeStatementForPersist } from "@/server/ftml/declaredSymbols";
import { ExtractBlockType } from "@/types/blockType";
import { createServerFn } from "@tanstack/react-start";

export type CreateFloDownBlockWithDeclaredSymbolInput = {
  documentId: string;
  documentPageId?: string | null;
  pageNumber?: number | null;
  blockType?: ExtractBlockType;
  paragraphFileName: string;
  originalText: string;
  statement?: FloDownStatement;
  symbolName: string;
  symbolUri?: string;
  existingSymbolId?: string;
  futureRepo: string;
  filePath: string;
  language: string;
};

export type CreatedSymbolTarget = {
  floDownBlock: {
    id: string;
    pageNumber: number | null;
    statement: FloDownStatement;
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

function buildPlainDefinitionStatement(originalText: string): DefinitionNode {
  return {
    type: "definition",
    for_symbols: [],
    content: [
      {
        type: "paragraph",
        content: [originalText],
      },
    ],
  };
}

export const createFloDownBlockWithDeclaredSymbol = createServerFn({
  method: "POST",
})
  .inputValidator((data: CreateFloDownBlockWithDeclaredSymbolInput) => data)
  .handler(async ({ data }) => {
    const paragraphFileName = data.paragraphFileName?.trim();
    const originalText = data.originalText?.trim();
    const symbolName = data.symbolName?.trim();
    const existingSymbolId = data.existingSymbolId?.trim();
    const symbolUri = data.symbolUri?.trim() || existingSymbolId;
    const futureRepo = data.futureRepo?.trim();
    const filePath = data.filePath?.trim();
    const language = data.language?.trim();

    if (
      !data.documentId ||
      !paragraphFileName ||
      !originalText ||
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

    const rawStatement =
      data.statement ?? buildPlainDefinitionStatement(originalText);
    const statement = sanitizeStatementForPersist(rawStatement);
    const serializedStatement = JSON.parse(JSON.stringify(statement));
    const isNewSymbol = !existingSymbolId;

    if (isNewSymbol && !symbolUri) {
      throw new Error("Symbol URI required");
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdFloDownBlock = await tx.floDownBlock.create({
        data: {
          documentId: data.documentId,
          documentPageId,
          pageNumber: null,
          originalText: originalText,
          statement: serializedStatement,
          futureRepo,
          filePath,
          fileName: paragraphFileName,
          language,
          createdById: userId,
          updatedById: userId,
          currentVersion: 1,
          status: "EXTRACTED",
        },
      });

      await tx.floDownBlockVersion.create({
        data: {
          floDownBlockId: createdFloDownBlock.id,
          versionNumber: 1,
          originalText: originalText,
          statement: serializedStatement,
          editedById: userId,
        },
      });

      if (isNewSymbol && symbolUri) {
        await addDeclaredSymbol(tx, createdFloDownBlock.id, {
          symbolName,
          symbolUri,
        });
      }

      await tx.document.update({
        where: { id: data.documentId },
        data: { status: "TEXT_EXTRACTED" },
      });

      return {
        floDownBlock: {
          id: createdFloDownBlock.id,
          pageNumber: createdFloDownBlock.pageNumber,
          statement: assertFloDownStatement(createdFloDownBlock.statement),
          futureRepo: createdFloDownBlock.futureRepo,
          filePath: createdFloDownBlock.filePath,
          fileName: createdFloDownBlock.fileName,
          language: createdFloDownBlock.language,
        },
        symbol: {
          id: symbolUri ?? existingSymbolId ?? symbolName,
          symbolName,
          futureRepo,
          filePath,
          fileName: paragraphFileName,
          language,
        },
      } satisfies CreatedSymbolTarget;
    });

    return result;
  });

export type DeclareCreatedSymbolDefiniendumInput = {
  floDownBlockId: string;
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
      !data.floDownBlockId ||
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
      const floDownBlock = await tx.floDownBlock.findUnique({
        where: { id: data.floDownBlockId },
      });

      if (!floDownBlock?.statement) {
        throw new Error("Content not found");
      }

      const symbolUri = data.symbolId.trim();
      if (!symbolUri) {
        throw new Error("Symbol URI required");
      }

      const root = normalizeToRoot(assertFloDownStatement(floDownBlock.statement));
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
        uri: symbolUri,
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

      const nextVersion = floDownBlock.currentVersion + 1;
      const statement = sanitizeStatementForPersist(unwrapRoot(updatedRoot));

      await addDeclaredSymbol(tx, floDownBlock.id, {
        symbolName: selectedText,
        symbolUri,
      });

      await tx.floDownBlockVersion.create({
        data: {
          floDownBlockId: floDownBlock.id,
          versionNumber: nextVersion,
          originalText: floDownBlock.originalText,
          statement: JSON.parse(JSON.stringify(statement)),
          editedById: userId,
        },
      });

      await tx.floDownBlock.update({
        where: { id: floDownBlock.id },
        data: {
          statement: JSON.parse(JSON.stringify(statement)),
          updatedById: userId,
          currentVersion: nextVersion,
        },
      });
    });

    return { ok: true };
  });
