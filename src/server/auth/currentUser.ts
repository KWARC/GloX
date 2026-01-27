import prisma from "@/lib/prisma";
import { parseCookies } from "@/server/auth/cookies";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import jwt from "jsonwebtoken";

export const currentUser = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const JWT_SECRET = process.env.JWT_SECRET;
      if (!JWT_SECRET) return { loggedIn: false };
      const req = getRequest();
      const cookies = parseCookies(req.headers.get("cookie"));
      const token = cookies["access_token"];

      if (!token) {
        return { loggedIn: false };
      }

      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          Firstname: true,
          LastName: true,
        },
      });

      if (!user) {
        return { loggedIn: false };
      }

      return {
        loggedIn: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.Firstname ?? undefined,
          lastName: user.LastName ?? undefined,
        },
      };
    } catch {
      return { loggedIn: false };
    }
  },
);
