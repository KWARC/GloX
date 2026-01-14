import { createServerFn } from "@tanstack/react-start";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/server/authSession";

type GetDocumentPagesInput = {
  documentId: string;
};

export const getDocumentPages = createServerFn({ method: "POST" })
  .inputValidator((data: GetDocumentPagesInput) => data)
  .handler(async ({ data }) => {
    const { documentId } = data;

    const userId = getSessionUser();
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return prisma.documentPage.findMany({
      where: {
        documentId,
        document: {
          userId,
        },
      },
      orderBy: {
        pageNumber: "asc",
      },
    });
  });
