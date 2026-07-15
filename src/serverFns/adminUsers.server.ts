import prisma from "@/lib/prisma";
import { requireUserId } from "@/server/auth/requireUser";
import { createServerFn } from "@tanstack/react-start";

export type UserRoleValue = "ADMIN" | "CURATOR" | "EXTRACTOR";

export type AdminProfileUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  emailVerified: boolean;
  role: UserRoleValue;
};

type UpdateAdminUserRoleInput = {
  userId: string;
  role: UserRoleValue;
};

type UpdateAdminUserRoleResult = {
  success: boolean;
  error?: string;
};

async function requireAdminAccess() {
  const currentUserId = await requireUserId();

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  if (currentUser.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  return currentUser;
}

export const listAdminProfileUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminProfileUser[]> => {
    const admin = await requireAdminAccess();

    const users = await prisma.user.findMany({
      where: {
        id: {
          not: admin.id,
        },
      },
      orderBy: {
        email: "asc",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        role: true,
      },
    });

    return users;
  },
);

export const updateAdminUserRole = createServerFn({ method: "POST" })
  .inputValidator((data): UpdateAdminUserRoleInput => {
    const input = data as Partial<UpdateAdminUserRoleInput>;
    const role = input?.role;

    if (role !== "ADMIN" && role !== "CURATOR" && role !== "EXTRACTOR") {
      throw new Error("Invalid role");
    }

    return {
      userId: String(input?.userId ?? "").trim(),
      role,
    };
  })
  .handler(async ({ data }): Promise<UpdateAdminUserRoleResult> => {
    try {
      if (!data.userId) {
        return { success: false, error: "Invalid input" };
      }

      const admin = await requireAdminAccess();

      if (admin.id === data.userId) {
        return {
          success: false,
          error: "You cannot change your own role.",
        };
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: data.userId },
        select: {
          id: true,
        },
      });

      if (!targetUser) {
        return {
          success: false,
          error: "User not found.",
        };
      }

      await prisma.user.update({
        where: { id: data.userId },
        data: {
          role: data.role,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("Update admin user role error:", error);

      if (error instanceof Error) {
        if (error.message === "Forbidden") {
          return {
            success: false,
            error: "Only admins can update user roles.",
          };
        }

        if (
          error.message === "Not authenticated" ||
          error.message === "Session expired" ||
          error.message === "Invalid session" ||
          error.message === "Invalid or expired session"
        ) {
          return { success: false, error: "Please log in again" };
        }

        if (error.message === "Invalid role") {
          return { success: false, error: "Invalid role selected." };
        }
      }

      return {
        success: false,
        error: "Failed to update user role. Please try again.",
      };
    }
  });
