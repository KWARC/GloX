import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";
import { currentUser } from "./currentUser";

export const adminUser = createServerFn({ method: "GET" }).handler(async () => {
  const res = await currentUser();

  if (!res.loggedIn) {
    return {
      loggedIn: false,
      isAdmin: false,
      user: null,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: res.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return {
      loggedIn: false,
      isAdmin: false,
      user: null,
    };
  }

  return {
    loggedIn: true,
    isAdmin: user.role === "ADMIN",
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
});
