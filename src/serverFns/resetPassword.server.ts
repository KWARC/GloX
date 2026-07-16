import prisma from "@/lib/prisma";
import {
  passwordFingerprintMatches,
  validatePassword,
} from "@/server/auth/password";
import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;

interface ResetPasswordInput {
  token: string;
  password: string;
}

interface ResetPasswordResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface ResetTokenPayload {
  email: string;
  purpose: string;
  passwordFingerprint: string;
}

export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((data: ResetPasswordInput): ResetPasswordInput => {
    if (
      !data ||
      typeof data.token !== "string" ||
      typeof data.password !== "string"
    ) {
      throw new Error("Invalid input");
    }

    const passwordError = validatePassword(data.password);
    if (passwordError) throw new Error(passwordError);

    return data;
  })
  .handler(async ({ data }): Promise<ResetPasswordResult> => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) throw new Error("Server misconfiguration");

    let decoded: ResetTokenPayload;
    try {
      decoded = jwt.verify(data.token, JWT_SECRET) as ResetTokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { success: false, error: "This password reset link has expired." };
      }

      return { success: false, error: "This password reset link is invalid." };
    }

    if (
      decoded.purpose !== "password-reset" ||
      typeof decoded.email !== "string" ||
      typeof decoded.passwordFingerprint !== "string"
    ) {
      return { success: false, error: "This password reset link is invalid." };
    }

    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
      select: { id: true, emailVerified: true, passwordHash: true },
    });

    if (
      !user ||
      !user.emailVerified ||
      !user.passwordHash ||
      !passwordFingerprintMatches(
        decoded.passwordFingerprint,
        user.passwordHash,
        JWT_SECRET,
      )
    ) {
      return {
        success: false,
        error: "This password reset link is no longer valid. Please request a new one.",
      };
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const result = await prisma.user.updateMany({
      where: { id: user.id, passwordHash: user.passwordHash },
      data: { passwordHash },
    });

    if (result.count !== 1) {
      return {
        success: false,
        error: "This password reset link is no longer valid. Please request a new one.",
      };
    }

    return {
      success: true,
      message: "Your password has been reset. Please log in with your new password.",
    };
  });
