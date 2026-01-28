import prisma from "@/lib/prisma";
import type {
  CreateDefinitionInput,
  UpdateDefinitionInput,
} from "@/server/document/document.types";
import { createServerFn } from "@tanstack/react-start";

export type UpdateDefinitionMetaInput = {
  id: string;
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
      !data.statement?.trim() ||
      !data.futureRepo?.trim() ||
      !data.filePath?.trim() ||
      !data.fileName?.trim() ||
      !data.language?.trim()
    ) {
      throw new Error("Missing definition fields");
    }

    await prisma.definition.create({
      data: {
        documentId: data.documentId,
        documentPageId: data.documentPageId,
        pageNumber: data.pageNumber,
        originalText: data.originalText,
        statement: data.statement,
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

export const listDefinition = createServerFn({ method: "GET" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    return prisma.definition.findMany({
      where: { documentId: data.documentId },
      orderBy: { createdAt: "asc" },
      include: {
        definienda: {
          include: {
            definiendum: true,
          },
        },
        symbolicRefs: {
          include: {
            symbolicReference: true,
          },
        },
      },
    });
  });

export const updateDefinition = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateDefinitionInput) => data)
  .handler(async ({ data }) => {
    if (!data.id) {
      throw new Error("Missing definition id");
    }

    return prisma.definition.update({
      where: { id: data.id },
      data: {
        ...(data.statement !== undefined && { statement: data.statement }),
      },
    });
  });

export const updateDefinitionMeta = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateDefinitionMetaInput) => data)
  .handler(async ({ data }) => {
    const { id, futureRepo, filePath, fileName, language } = data;

    return prisma.definition.update({
      where: { id },
      data: { futureRepo, filePath, fileName, language },
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
