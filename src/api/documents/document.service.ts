console.log("DOCUMENT SERVICE MODULE LOADED");
import crypto from "node:crypto";
import prisma from "../../lib/prisma";

import { UploadDocumentInput, UploadDocumentResult } from "./document.types";
import { extractPdfText } from "./text-extractor";

export async function uploadDocument(
  input: UploadDocumentInput
): Promise<UploadDocumentResult> {
  const { file, userId } = input;

  if (!(file instanceof File)) {
    throw new Error("INVALID_FILE");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

  const existing = await prisma.document.findUnique({
    where: { fileHash },
  });

  if (existing) {
    return {
      status: "DUPLICATE",
      documentId: existing.id,
    };
  }

  const document = await prisma.document.create({
    data: {
      filename: file.name,
      fileHash,
      mimeType: file.type,
      fileSize: buffer.length,
      userId,
      status: "UPLOADED",
    },
  });

  try {
    console.log("EXTRACTION: start", document.id);

    const extractedText = await extractPdfText(buffer);

    console.log(
      "EXTRACTION: success",
      document.id,
      "length:",
      extractedText?.length
    );

    await prisma.document.update({
      where: { id: document.id },
      data: {
        extractedText,
        status: "TEXT_EXTRACTED",
      },
    });

    console.log("DB UPDATE: TEXT_EXTRACTED", document.id);
  } catch (error) {
    console.error("EXTRACTION FAILED:", error);

    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "FAILED",
      },
    });
  }

  return {
    status: "OK",
    documentId: document.id,
  };
}
