import prisma from "@/lib/prisma";
import type {
  CreateExtractedTextInput,
  UpdateExtractedTextInput,
} from "@/server/document/document.types";
import { createServerFn } from "@tanstack/react-start";

export const createExtractedText = createServerFn<
  any,
  "POST",
  CreateExtractedTextInput,
  Promise<any>
>({ method: "POST" }).handler(async (ctx) => {
  const {
    documentId,
    documentPageId,
    pageNumber,
    originalText,
    statement,
    futureRepo,
    filePath,
    fileName,
    language,
  } = (ctx.data ?? {}) as CreateExtractedTextInput;

  if (
    !documentId ||
    !documentPageId ||
    typeof pageNumber !== "number" ||
    !originalText?.trim() ||
    !statement?.trim() ||
    !futureRepo?.trim() ||
    !filePath?.trim() ||
    !fileName?.trim() ||
    !language?.trim()
  ) {
    throw new Error("Missing extracted text fields");
  }

  const extracted = await prisma.extractedText.create({
    data: {
      documentId,
      documentPageId,
      pageNumber,
      originalText,
      statement,
      futureRepo,
      filePath,
      fileName,
      language,
    },
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "TEXT_EXTRACTED" },
  });

  return extracted;
});

export const listExtractedText = createServerFn({ method: "GET" }).handler(
  async (ctx) => {
    const data = (ctx.data ?? {}) as Partial<{ documentId: string }>;

    if (!data.documentId) {
      throw new Error("documentId is required");
    }

    return prisma.extractedText.findMany({
      where: { documentId: data.documentId },
      orderBy: { createdAt: "asc" },
    });
  }
);

export const updateExtractedText = createServerFn<
  any,
  "POST",
  UpdateExtractedTextInput,
  Promise<any>
>({ method: "POST" }).handler(async (ctx) => {
  const data = (ctx.data ?? {}) as Partial<UpdateExtractedTextInput>;

  if (!data.id || !data.statement?.trim()) {
    throw new Error("Missing update fields");
  }

  return prisma.extractedText.update({
    where: { id: data.id },
    data: { statement: data.statement },
  });
});
