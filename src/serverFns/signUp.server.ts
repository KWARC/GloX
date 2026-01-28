import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const SALT_ROUNDS = 10;

interface SignupInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface SignupResult {
  success: boolean;
  error?: string;
  message?: string;
}

export const signup = createServerFn({ method: "POST" })
  .inputValidator((data: SignupInput): SignupInput => {
    if (
      !data ||
      typeof data.email !== "string" ||
      typeof data.password !== "string" ||
      typeof data.firstName !== "string" ||
      typeof data.lastName !== "string"
    ) {
      throw new Error("Invalid input");
    }

    if (data.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    return {
      email: data.email.toLowerCase().trim(),
      password: data.password,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
    };
  })
  .handler(async ({ data }): Promise<SignupResult> => {
    const JWT_SECRET = process.env.JWT_SECRET;
    const NODEMAILER_EMAIL_ID = process.env.NODEMAILER_EMAIL_ID;
    const NODEMAILER_EMAIL_PASSWORD = process.env.NODEMAILER_EMAIL_PASSWORD;
    const APP_URL = process.env.APP_URL || "http://localhost:3000";

    if (!JWT_SECRET || !NODEMAILER_EMAIL_ID || !NODEMAILER_EMAIL_PASSWORD) {
      throw new Error("Server misconfiguration");
    }

    const { email, password, firstName, lastName } = data;

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return {
          success: false,
          error: "An account with this email already exists",
        };
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const verificationToken = jwt.sign(
        { email, purpose: "email-verification" },
        JWT_SECRET,
        { expiresIn: "24h" },
      );

      await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
        },
      });

      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: NODEMAILER_EMAIL_ID,
          pass: NODEMAILER_EMAIL_PASSWORD,
        },
      });

      const verificationLink = `${APP_URL}/verify?token=${verificationToken}`;

      await transporter.sendMail({
        from: NODEMAILER_EMAIL_ID,
        to: email,
        subject: "Verify Your Email Address",
        text: `Verify your email: ${verificationLink}`,
        html: `<p>Verify your email: <a href="${verificationLink}">${verificationLink}</a></p>`,
      });

      return {
        success: true,
        message:
          "Account created! Please check your email to verify your account.",
      };
    } catch (error) {
      console.error("Signup error:", error);

      return {
        success: false,
        error: "An error occurred during signup. Please try again.",
      };
    }
  });
