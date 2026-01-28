import prisma from "@/lib/prisma";
import { ParagraphNode } from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

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

    // ✅ CORRECT: Initial AST = simple paragraph with plain text
    const statement: ParagraphNode = {
      type: "paragraph",
      content: [data.originalText.trim()],
    };

    await prisma.definition.create({
      data: {
        documentId: data.documentId,
        documentPageId: data.documentPageId,
        pageNumber: data.pageNumber,
        originalText: data.originalText,
        statement, // Stored as JSON
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
  .inputValidator((data: { id: string; statement: any }) => data)
  .handler(async ({ data }) => {
    if (!data.id) {
      throw new Error("Missing definition id");
    }

    return prisma.definition.update({
      where: { id: data.id },
      data: { statement: data.statement },
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

export const updateDefinitionMeta = createServerFn({ method: "POST" })
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
