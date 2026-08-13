import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

export const getMyDocuments = createServerFn({ method: "GET" }).handler(
  async () => {
    const res = await currentUser();

    if (!res.loggedIn) {
      return {
        success: false,
        error: "Not logged in",
        code: "NOT_AUTHENTICATED",
      };
    }

    const role = res.user.role;

    const docs = await prisma.document.findMany({
      where:
        role === "ADMIN"
          ? {}
          : { userId: res.user.id },
      orderBy: { createdAt: "desc" },
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

    return {
      success: true,
      documents: docs.map((doc) => ({
        ...doc,
        floDownBlockCount: doc._count.floDownBlocks,
        markReferenceCount: doc._count.markReferences,
        pageCount: doc._count.pages,
      })),
    };
  },
);
