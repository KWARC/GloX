import prisma from "@/lib/prisma";
import { ExtractedItem } from "@/server/text-selection";
import {
  DefinitionNode,
  FtmlStatement,
  assertFtmlStatement,
} from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";
import { FileIdentity } from "./latex.server";

export type CreateDefinitionInput = {
  documentId: string;
  documentPageId: string;
  pageNumber: number;
  originalText: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const createDefinition = createServerFn({ method: "POST" })
  .inputValidator((data: CreateDefinitionInput) => data)
  .handler(async ({ data }) => {
    if (
      !data.documentId ||
      !data.documentPageId ||
      typeof data.pageNumber !== "number" ||
      !data.originalText?.trim() ||
      !data.futureRepo?.trim() ||
      !data.filePath?.trim() ||
      !data.fileName?.trim() ||
      !data.language?.trim()
    ) {
      throw new Error("Missing definition fields");
    }

    const statement: DefinitionNode = {
      type: "definition",
      for_symbols: [],
      content: [
        {
          type: "paragraph",
          content: [data.originalText.trim()],
        },
      ],
    };

    await prisma.definition.create({
      data: {
        documentId: data.documentId,
        documentPageId: data.documentPageId,
        pageNumber: data.pageNumber,
        originalText: data.originalText,
        statement: JSON.parse(JSON.stringify(statement)),
        futureRepo: data.futureRepo,
        filePath: data.filePath,
        fileName: data.fileName,
        language: data.language,
      },
    });

    await prisma.document.update({
      where: { id: data.documentId },
      data: { status: "TEXT_EXTRACTED" },
    });

    return { success: true };
  });

export const updateDefinition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; statement: FtmlStatement }) => data)
  .handler(async ({ data }) => {
    if (!data.id) {
      throw new Error("Missing definition id");
    }

    return prisma.definition.update({
      where: { id: data.id },
      data: { statement: JSON.parse(JSON.stringify(data.statement)) },
    });
  });

export const deleteDefinition = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await prisma.definition.delete({
      where: { id: data.id },
    });

    return { success: true };
  });

export const updateDefinitionFilePath = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      futureRepo: string;
      filePath: string;
      fileName: string;
      language: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return prisma.definition.update({
      where: { id: data.id },
      data: {
        futureRepo: data.futureRepo,
        filePath: data.filePath,
        fileName: data.fileName,
        language: data.language,
      },
    });
  });

export const updateDefinitionsFilePath = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      identity: FileIdentity;
      futureRepo: string;
      filePath: string;
      fileName: string;
      language: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { identity, futureRepo, filePath, fileName, language } = data;

    await prisma.definition.updateMany({
      where: {
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        fileName: identity.fileName,
        language: identity.language,
      },
      data: {
        futureRepo,
        filePath,
        fileName,
        language,
      },
    });

    return { success: true };
  });

export const listDefinition = createServerFn({ method: "GET" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const defs = await prisma.definition.findMany({
      where: { documentId: data.documentId },
      orderBy: { createdAt: "asc" },
      include: {
        symbolicRefs: {
          include: {
            symbolicReference: true,
          },
        },
      },
    });

    const items: ExtractedItem[] = defs.map((def) => {
      if (!def.statement) {
        throw new Error("Definition has no FTML statement");
      }

      const statement = assertFtmlStatement(def.statement) as FtmlStatement;

      return {
        id: def.id,
        pageNumber: def.pageNumber,
        statement,
        futureRepo: def.futureRepo,
        filePath: def.filePath,
        fileName: def.fileName,
        language: def.language,
        symbolicRefs: def.symbolicRefs,
      };
    });

    return items;
  });
