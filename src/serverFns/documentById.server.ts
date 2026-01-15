import { createServerFn } from "@tanstack/react-start";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/server/auth/authSession";

type GetDocumentByIdInput = {
  id: string;
};

export const getDocumentById = createServerFn({ method: "POST" })
  .inputValidator((data: GetDocumentByIdInput) => data)
  .handler(async ({ data }) => {
    const { id } = data;

    const userId = getSessionUser();
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const doc = await prisma.document.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    return doc;
  });
