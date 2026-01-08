import { createServerFn } from "@tanstack/react-start";
import prisma from "@/lib/prisma";
import type { CreateExtractedTextInput } from "@/server/document/document.types";

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
  } = (ctx.data ?? {}) as CreateExtractedTextInput;

  if (
    !documentId ||
    !documentPageId ||
    typeof pageNumber !== "number" ||
    !originalText?.trim() ||
    !statement?.trim() ||
    !futureRepo?.trim() ||
    !filePath?.trim()
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
    },
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "TEXT_EXTRACTED" },
  });

  return extracted;
});
