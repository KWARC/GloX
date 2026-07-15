import prisma from "@/lib/prisma";
import { createPasswordFingerprint } from "@/server/auth/password";
import { createServerFn } from "@tanstack/react-start";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const RESET_TOKEN_EXPIRES_IN = "15m";
const GENERIC_MESSAGE =
  "A password reset link has been sent to your mail.";

interface RequestPasswordResetInput {
  email: string;
}

interface RequestPasswordResetResult {
  success: true;
  message: string;
}

export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator(
    (data: RequestPasswordResetInput): RequestPasswordResetInput => {
      if (!data || typeof data.email !== "string") {
        throw new Error("Invalid input");
      }

      return { email: data.email.toLowerCase().trim() };
    },
  )
  .handler(async ({ data }): Promise<RequestPasswordResetResult> => {
    const JWT_SECRET = process.env.JWT_SECRET;
    const NODEMAILER_EMAIL_ID = process.env.NODEMAILER_EMAIL_ID;
    const NODEMAILER_EMAIL_PASSWORD = process.env.NODEMAILER_EMAIL_PASSWORD;
    const APP_URL = process.env.APP_ORIGIN || "http://localhost:3000";

    if (!JWT_SECRET || !NODEMAILER_EMAIL_ID || !NODEMAILER_EMAIL_PASSWORD) {
      throw new Error("Server misconfiguration");
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: data.email },
        select: { email: true, emailVerified: true, passwordHash: true },
      });

      if (!user || !user.emailVerified || !user.passwordHash) {
        return { success: true, message: GENERIC_MESSAGE };
      }

      const token = jwt.sign(
        {
          email: user.email,
          purpose: "password-reset",
          passwordFingerprint: createPasswordFingerprint(
            user.passwordHash,
            JWT_SECRET,
          ),
        },
        JWT_SECRET,
        { expiresIn: RESET_TOKEN_EXPIRES_IN },
      );
      const resetLink = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: { user: NODEMAILER_EMAIL_ID, pass: NODEMAILER_EMAIL_PASSWORD },
      });

      await transporter.sendMail({
        from: NODEMAILER_EMAIL_ID,
        to: user.email,
        subject: "Reset your GloX password",
        text: `Reset your GloX password within 15 minutes: ${resetLink}`,
        html: `<p>Use this link to reset your GloX password within 15 minutes:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
      });
    } catch (error) {
      // Keep the public response generic so delivery failures do not disclose account state.
      console.error("Password reset request error:", error);
    }

    return { success: true, message: GENERIC_MESSAGE };
  });
