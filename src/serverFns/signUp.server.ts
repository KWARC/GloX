import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

type SignupInput = {
  email: string;
  password: string;
};

type SignupResult =
  | { success: true; userId: string }
  | { success: false; error: string };

export const signup = createServerFn({ method: "POST" })
  .inputValidator((data: SignupInput) => data)
  .handler(async ({ data }): Promise<SignupResult> => {
    const { email, password } = data;

    if (!email?.trim() || !password?.trim()) {
      return { success: false, error: "Email and password are required" };
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return { success: false, error: "User already exists" };
    }

    // Hash password (same salt rounds as ALeA)
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        isFauUser: false,
      },
    });

    // ALeA rule: signup does NOT auto-login
    return { success: true, userId: user.id };
  });
