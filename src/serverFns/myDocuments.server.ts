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
    });

    return {
      success: true,
      documents: docs,
    };
  },
);
