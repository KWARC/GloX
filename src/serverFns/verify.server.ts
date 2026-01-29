import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";
import jwt from "jsonwebtoken";

interface VerifyInput {
  token: string;
}

interface VerifyResult {
  success: boolean;
  error?: string;
  message?: string;
}

export const verifyEmail = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): VerifyInput => {
    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid input");
    }

    const { token } = data as Record<string, unknown>;

    if (typeof token !== "string" || !token) {
      throw new Error("Verification token is required");
    }

    return { token };
  })

  .handler(async ({ data }): Promise<VerifyResult> => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error("Server misconfiguration");
    }

    const { token } = data;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        email: string;
        purpose: string;
      };

      if (decoded.purpose !== "email-verification") {
        return {
          success: false,
          error: "Invalid verification token",
        };
      }

      const user = await prisma.user.findUnique({
        where: { email: decoded.email },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
        };
      }

      return {
        success: true,
        message: "Email verified successfully! You can now log in.",
      };
    } catch (error) {
      console.error("Verification error:", error);

      if (error instanceof jwt.TokenExpiredError) {
        return {
          success: false,
          error: "Verification link has expired. Please request a new one.",
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          success: false,
          error: "Invalid verification token",
        };
      }

      return {
        success: false,
        error: "An error occurred during verification",
      };
    }
  });
