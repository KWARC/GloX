import prisma from "@/lib/prisma";
import { parseCookies } from "@/server/auth/cookies";
import { passwordFingerprintMatches } from "@/server/auth/password";
import { getRequest } from "@tanstack/react-start/server";
import jwt from "jsonwebtoken";

export async function requireUserId(): Promise<string> {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error("Server misconfiguration");
  }
  const req = getRequest();
  const cookies = parseCookies(req.headers.get("cookie"));
  const token = cookies["access_token"];

  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      passwordFingerprint?: string;
    };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { passwordHash: true },
    });

    if (
      !user?.passwordHash ||
      !decoded.passwordFingerprint ||
      !passwordFingerprintMatches(
        decoded.passwordFingerprint,
        user.passwordHash,
        JWT_SECRET,
      )
    ) {
      throw new Error("Invalid or expired session");
    }

    return decoded.userId;
  } catch {
    throw new Error("Invalid or expired session");
  }
}
