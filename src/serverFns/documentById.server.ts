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

    const role = res.user.role;

    const doc = await prisma.document.findUnique({
      where: { id: data.id },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    if (role !== "ADMIN" && doc.userId !== res.user.id) {
      throw new Error("Unauthorized");
    }

    return doc;
  });
