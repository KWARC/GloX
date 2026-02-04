import prisma from "@/lib/prisma";
import { insertDefiniendum } from "@/server/ftml/astOperations";
import {
  DefiniendumNode,
  DefinitionNode,
  normalizeToRoot,
  ParagraphNode,
  unwrapRoot,
} from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

export type CreateDefiniendumInput = {
  definitionId: string;
  symbolName: string;
  alias?: string | null;
  selectedText: string;
  symbolDeclared?: boolean;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const createDefiniendum = createServerFn({ method: "POST" })
  .inputValidator((data: CreateDefiniendumInput) => data)
  .handler(async ({ data }) => {
    if (
      !data.symbolName.trim() ||
      !data.futureRepo.trim() ||
      !data.filePath.trim() ||
      !data.fileName.trim() ||
      !data.language.trim()
    ) {
      throw new Error("Missing definiendum fields");
    }

    const {
      definitionId,
      symbolName,
      alias,
      selectedText,
      symbolDeclared = true,
      futureRepo,
      filePath,
      fileName,
      language,
    } = data;

    const definition = await prisma.definition.findUnique({
      where: { id: definitionId },
      include: {
        definienda: {
          include: { definiendum: true },
        },
      },
    });

    if (!definition) {
      throw new Error("Definition not found");
    }

    const defin = await prisma.definiendum.create({
      data: {
        symbolName,
        alias,
        symbolDeclared,
        futureRepo,
        filePath,
        fileName,
        language,
      },
    });

    await prisma.definitionDefiniendum.create({
      data: {
        definitionId,
        definiendumId: defin.id,
      },
    });

    const currentAst = normalizeToRoot(definition.statement as any);

    const definiendumUri = `LOCAL:${symbolName}`;

    const createDefiniendumNode = (text: string): DefiniendumNode => ({
      type: "definiendum",
      uri: definiendumUri,
      content: [alias || text],
    });

    const isAlreadyDefinition =
      currentAst.content.length === 1 &&
      currentAst.content[0].type === "definition";

    let updatedAst;

    if (isAlreadyDefinition) {
      const existingDef = currentAst.content[0] as DefinitionNode;
      const innerParagraph = existingDef.content[0] as ParagraphNode;

      const updatedContent = insertDefiniendum(
        innerParagraph.content,
        selectedText,
        createDefiniendumNode,
      );
      if (
        JSON.stringify(innerParagraph.content) ===
        JSON.stringify(updatedContent)
      ) {
        throw new Error(`Definiendum insertion failed: "${selectedText}"`);
      }

      updatedAst = {
        ...currentAst,
        content: [
          {
            ...existingDef,
            for_symbols: [...(existingDef.for_symbols || []), definiendumUri],
            content: [
              {
                ...innerParagraph,
                content: updatedContent,
              },
            ],
          },
        ],
      };
    } else {
      const paragraph = currentAst.content[0] as ParagraphNode;

      const updatedContent = insertDefiniendum(
        paragraph.content,
        selectedText,
        createDefiniendumNode,
      );

      if (
        JSON.stringify(paragraph.content) === JSON.stringify(updatedContent)
      ) {
        throw new Error(`Definiendum insertion failed: "${selectedText}"`);
      }

      const definitionNode: DefinitionNode = {
        type: "definition",
        for_symbols: [definiendumUri],
        content: [
          {
            type: "paragraph",
            content: updatedContent,
          },
        ],
      };

      updatedAst = {
        ...currentAst,
        content: [definitionNode],
      };
    }

    const statementToStore = unwrapRoot(updatedAst);

    await prisma.definition.update({
      where: { id: definitionId },
      data: { statement: statementToStore },
    });

    return defin;
  });

export const searchDefiniendum = createServerFn({ method: "POST" })
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => {
    return prisma.definiendum.findMany({
      where: {
        symbolName: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 10,
    });
  });
