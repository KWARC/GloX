import prisma from "@/lib/prisma";
import { getPageImagePath } from "@/pdfToImage/PdfToImages";
import { requireUserId } from "@/server/auth/requireUser";
import { createServerFn } from "@tanstack/react-start";
import fs from "node:fs";

function toBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

export const getPageImage = createServerFn({ method: "GET" })
  .inputValidator((data: { documentId: string; pageNumber: number }) => data)
  .handler(async ({ data }) => {
    requireUserId();

    const doc = await prisma.document.findUnique({
      where: { id: data.documentId },
    });

    if (!doc) {
      throw new Error("DOCUMENT_NOT_FOUND");
    }

    const imagePath = getPageImagePath(doc.filename, data.pageNumber);

    if (!fs.existsSync(imagePath)) {
      throw new Error("IMAGE_NOT_FOUND");
    }

    const buffer = fs.readFileSync(imagePath);

    return {
      base64: toBase64(buffer),
      mimeType: "image/jpeg",
    };
  });
