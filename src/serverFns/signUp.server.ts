import { createServerFn } from "@tanstack/react-start";
import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import { setSessionUser } from "../server/authSession";

export const signup = createServerFn({ method: "POST" }).handler(
  async (ctx) => {
    const { email, password } = (ctx.data ?? {}) as {
      email: string;
      password: string;
    };

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: false, error: "User already exists" };
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    setSessionUser(user.id);

    return { success: true, userId: user.id };
  }
);
