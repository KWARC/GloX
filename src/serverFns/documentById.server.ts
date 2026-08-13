import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

export const getDocumentById = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const res = await currentUser();

    if (!res.loggedIn) {
      throw new Error("Not authenticated");
    }

    const doc = await prisma.document.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        filename: true,
        fileHash: true,
        mimeType: true,
        fileSize: true,
        futureRepo: true,
        filePath: true,
        language: true,
        indexStatus: true,
        userId: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            floDownBlocks: true,
            markReferences: true,
            pages: true,
          },
        },
      },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    const { _count, ...document } = doc;

    return {
      ...document,
      floDownBlockCount: _count.floDownBlocks,
      markReferenceCount: _count.markReferences,
      pageCount: _count.pages,
    };
  });
