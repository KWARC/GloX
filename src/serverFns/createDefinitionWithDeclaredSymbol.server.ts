import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { DefinitionNode, FtmlContent } from "@/types/ftml.types";
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

function buildDeclaredSymbolStatement(
  definitionText: string,
  symbolName: string,
): DefinitionNode {
  const content: FtmlContent[] = [];
  const symbolIndex = definitionText.indexOf(symbolName);
  const definiendumNode: FtmlContent = {
    type: "definiendum",
    uri: symbolName,
    content: [symbolName],
    symdecl: true,
  };

  if (symbolIndex >= 0) {
    const before = definitionText.slice(0, symbolIndex);
    const after = definitionText.slice(symbolIndex + symbolName.length);

    if (before) content.push(before);
    content.push(definiendumNode);
    if (after) content.push(after);
  } else {
    content.push(definiendumNode, " ", definitionText);
  }

  return {
    type: "definition",
    for_symbols: [symbolName],
    content: [
      {
        type: "paragraph",
        content,
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

    const statement = buildDeclaredSymbolStatement(definitionText, symbolName);
    const serializedStatement = JSON.parse(JSON.stringify(statement));

    const definition = await prisma.$transaction(async (tx) => {
      await tx.symbol.upsert({
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

      return createdDefinition;
    });

    return definition;
  });
