import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

export const getDocumentPages = createServerFn({ method: "POST" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const res = await currentUser();

    if (!res.loggedIn) {
      throw new Error("Not authenticated");
    }

    const role = res.user.role;

    return prisma.documentPage.findMany({
      where: {
        documentId: data.documentId,
        ...(role !== "ADMIN" && {
          document: { userId: res.user.id },
        }),
      },
      orderBy: { pageNumber: "asc" },
    });
  });
