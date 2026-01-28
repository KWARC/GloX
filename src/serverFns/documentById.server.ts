import prisma from "@/lib/prisma";
import { requireUserId } from "@/server/auth/requireUser";
import { createServerFn } from "@tanstack/react-start";

export const getDocumentById = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userId = requireUserId();

    const doc = await prisma.document.findFirst({
      where: { id: data.id, userId },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    return doc;
  });
