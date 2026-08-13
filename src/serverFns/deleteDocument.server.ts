import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

export const deleteDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const auth = await currentUser();
    if (!auth?.loggedIn) throw new Error("Unauthorized");
    const doc = await prisma.document.findUnique({
      where: { id: data.documentId },
      select: { id: true, userId: true },
    });

    if (!doc) throw new Error("Document not found");
    const isOwner = doc.userId === auth.user.id;
    const isAdmin = auth.user.role === "ADMIN";
    if (!isOwner && !isAdmin) throw new Error("Forbidden");
    await prisma.document.delete({
      where: { id: data.documentId },
    });

    return { success: true };
  });

export const checkDocumentFloDownBlocks = createServerFn({ method: "POST" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const auth = await currentUser();
    if (!auth?.loggedIn) throw new Error("Unauthorized");
    const doc = await prisma.document.findUnique({
      where: { id: data.documentId },
      select: {
        id: true,
        userId: true,
        floDownBlocks: {
          select: { id: true },
        },
        markReferences: {
          select: { id: true },
        },
      },
    });

    if (!doc) throw new Error("Document not found");
    const isOwner = doc.userId === auth.user.id;
    const isAdmin = auth.user.role === "ADMIN";
    if (!isOwner && !isAdmin) throw new Error("Forbidden");
    return {
      floDownBlockCount: doc.floDownBlocks.length,
      markReferenceCount: doc.markReferences.length,
    };
  });
