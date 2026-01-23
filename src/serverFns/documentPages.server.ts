import { createServerFn } from "@tanstack/react-start";
import prisma from "@/lib/prisma";
import { requireUserId } from "@/server/auth/authSession";


export const getDocumentPages = createServerFn({ method: "POST" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const userId = requireUserId();

    return prisma.documentPage.findMany({
      where: {
        documentId: data.documentId,
        document: { userId },
      },
      orderBy: { pageNumber: "asc" },
    });
  });
