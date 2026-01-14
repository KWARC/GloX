import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { setSessionUser } from "../server/authSession";

export type LoginInput = {
  email: string;
  password: string;
};

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: LoginInput) => data)
  .handler(async ({ data }) => {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, code: "NOT_SIGNED_UP" };
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return { success: false, error: "Invalid credentials" };
    }

    setSessionUser(user.id);

    return { success: true, userId: user.id };
  });
