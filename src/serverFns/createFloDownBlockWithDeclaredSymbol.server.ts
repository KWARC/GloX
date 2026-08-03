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
  normalizeToRoot,
  unwrapRoot,
} from "@/types/ftml.types";
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
  statement?: FtmlStatement;
  symbolName: string;
  existingSymbolId?: string;
  futureRepo: string;
  filePath: string;
  language: string;
};

export type CreatedSymbolTarget = {
  floDownBlock: {
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

function buildPlainDefinitionStatement(originalText: string): DefinitionNode {
  return {
    type: "definition",
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

    const result = await prisma.$transaction(async (tx) => {
      const symbol = existingSymbolId
        ? await tx.symbol.findUnique({
            where: { id: existingSymbolId },
          })
        : await tx.symbol.upsert({
            where: {
              symbolName_futureRepo_filePath_fileName_language: {
                symbolName,
                futureRepo,
                filePath,
                fileName: paragraphFileName,
                language,
              },
            },
            update: {},
            create: {
              symbolName,
              futureRepo,
              filePath,
              fileName: paragraphFileName,
              language,
            },
          });

      if (!symbol) {
        throw new Error("Symbol not found");
      }

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

      if (isNewSymbol) {
        await addDeclaredSymbol(
          tx,
          createdFloDownBlock.id,
          symbol.symbolName,
          {
            futureRepo,
            filePath,
            fileName: paragraphFileName,
            language,
          },
        );
      }

      await tx.document.update({
        where: { id: data.documentId },
        data: { status: "TEXT_EXTRACTED" },
      });

      return {
        floDownBlock: {
          id: createdFloDownBlock.id,
          pageNumber: createdFloDownBlock.pageNumber,
          statement: assertFtmlStatement(createdFloDownBlock.statement),
          futureRepo: createdFloDownBlock.futureRepo,
          filePath: createdFloDownBlock.filePath,
          fileName: createdFloDownBlock.fileName,
          language: createdFloDownBlock.language,
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
      const [floDownBlock, symbol] = await Promise.all([
        tx.floDownBlock.findUnique({ where: { id: data.floDownBlockId } }),
        tx.symbol.findUnique({ where: { id: data.symbolId } }),
      ]);

      if (!floDownBlock?.statement) {
        throw new Error("Content not found");
      }

      if (!symbol) {
        throw new Error("Symbol not found");
      }

      const root = normalizeToRoot(assertFtmlStatement(floDownBlock.statement));
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

      const nextVersion = floDownBlock.currentVersion + 1;
      const statement = sanitizeStatementForPersist(unwrapRoot(updatedRoot));

      await addDeclaredSymbol(
        tx,
        floDownBlock.id,
        symbol.symbolName,
        {
          futureRepo: floDownBlock.futureRepo,
          filePath: floDownBlock.filePath,
          fileName: floDownBlock.fileName,
          language: floDownBlock.language,
        },
      );

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
