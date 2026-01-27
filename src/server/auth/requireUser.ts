import jwt from "jsonwebtoken";
import { getRequest } from "@tanstack/react-start/server";
import { parseCookies } from "@/server/auth/cookies";

export function requireUserId(): string {
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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    throw new Error("Invalid or expired session");
  }
}
