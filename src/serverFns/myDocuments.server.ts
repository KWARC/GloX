import { createServerFn } from "@tanstack/react-start";
import prisma from "../lib/prisma";
import { getSessionUser } from "../server/auth/authSession";

export const getMyDocuments = createServerFn({ method: "GET" }).handler(
  async () => {
    const userId = getSessionUser();

    if (!userId) {
      return {
        success: false,
        error: "Not logged in",
        code: "NOT_AUTHENTICATED",
      };
    }

    const docs = await prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      documents: docs,
    };
  }
);
