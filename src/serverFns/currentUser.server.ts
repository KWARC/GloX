import { createServerFn } from "@tanstack/react-start";
import prisma from "../lib/prisma";
import { getSessionUser } from "../server/authSession";

export const currentUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const userId = getSessionUser();

    if (!userId) {
      return { loggedIn: false };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    return {
      loggedIn: !!user,
      user,
    };
  }
);
