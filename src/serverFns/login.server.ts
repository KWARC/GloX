import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";
import { getResponse } from "@tanstack/react-start/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = "7d";

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  error?: {
    code: "INVALID_CREDENTIALS" | "UNVERIFIED_EMAIL";
    message: string;
  };
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: LoginInput): LoginInput => {
    if (
      !data ||
      typeof data.email !== "string" ||
      typeof data.password !== "string"
    ) {
      throw new Error("Invalid input");
    }

    return {
      email: data.email.toLowerCase().trim(),
      password: data.password,
    };
  })
  .handler(async ({ data }): Promise<LoginResult> => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("Server misconfiguration");
    }

    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
      },
    });

    if (!user || !user.passwordHash) {
      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      };
    }

    if (!user.emailVerified) {
      return {
        success: false,
        error: {
          code: "UNVERIFIED_EMAIL",
          message: "Please verify your email first",
        },
      };
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Password is incorrect",
        },
      };
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const res = getResponse();

    res.headers.append(
      "Set-Cookie",
      [
        `access_token=${token}`,
        "HttpOnly",
        "Path=/",
        "SameSite=Lax",
        process.env.NODE_ENV === "production" ? "Secure" : "",
        "Max-Age=604800",
      ]
        .filter(Boolean)
        .join("; "),
    );

    res.headers.append(
      "Set-Cookie",
      [
        "is_logged_in=true",
        "Path=/",
        "SameSite=Lax",
        process.env.NODE_ENV === "production" ? "Secure" : "",
        "Max-Age=604800",
      ]
        .filter(Boolean)
        .join("; "),
    );

    return { success: true };
  });
