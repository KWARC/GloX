import { createServerFn } from "@tanstack/react-start";
import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import { setSessionUser } from "../server/authSession";

export const login = createServerFn({ method: "POST" }).handler(async (ctx) => {
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
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { success: false, error: "Invalid credentials" };
  }

  setSessionUser(user.id);

  return { success: true, userId: user.id };
});
