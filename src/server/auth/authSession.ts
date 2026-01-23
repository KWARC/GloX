// src/server/auth/requireUser.ts
import { getRequest } from "@tanstack/react-start/server";

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    })
  );
}

export function requireUserId(): string {
  const request = getRequest();
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies["access_token"];

  if (!token) {
    throw new Error("Not authenticated");
  }

  // 🔴 TEMP for fake login
  if (token.startsWith("fake-")) {
    return token.replace("fake-", "");
  }

  // 🔵 REAL login (example)
  // decode / verify JWT here
  // return userId from token

  throw new Error("Invalid access token");
}
