import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { setSessionUser } from "../server/auth/authSession";

type SignupInput = {
  email: string;
  password: string;
};

export const signup = createServerFn({ method: "POST" })
  .inputValidator((data: SignupInput) => data)
  .handler(async ({ data }) => {
    const { email, password } = data;

    if (!email?.trim() || !password?.trim()) {
      throw new Error("Email and password are required");
    }

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
  });
