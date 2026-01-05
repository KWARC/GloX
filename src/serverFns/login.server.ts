import { createServerFn } from "@tanstack/react-start";
import prisma from "../lib/prisma";
import { setSessionUser } from "../server/authSession";

export const login = createServerFn({ method: "POST" }).handler(
  async (ctx) => {
    const { email, password } = (ctx.data ?? {}) as {
      email: string;
      password: string;
    };

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, code: "NOT_SIGNED_UP" };
    }

    if (user.password !== password) {
      return { success: false, error: "Invalid credentials" };
    }

    await prisma.login.create({
      data: { userId: user.id },
    });

    setSessionUser(user.id);

    return { success: true, userId: user.id };
  }
);
