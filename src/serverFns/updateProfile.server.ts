import prisma from "@/lib/prisma";
import { requireUserId } from "@/server/auth/requireUser";
import { createServerFn } from "@tanstack/react-start";

interface UpdateProfileInput {
  firstName: string;
  lastName: string;
}

interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): UpdateProfileInput => {
    if (
      typeof data !== "object" ||
      data === null ||
      !("data" in data) ||
      typeof data.data !== "object" ||
      data.data === null
    ) {
      throw new Error("Invalid input");
    }

    const { firstName, lastName } = data.data as any;

    if (!firstName || typeof firstName !== "string") {
      throw new Error("First name is required");
    }

    if (firstName.trim().length === 0) {
      throw new Error("First name cannot be empty");
    }

    if (firstName.length > 100) {
      throw new Error("First name is too long");
    }

    if (!lastName || typeof lastName !== "string") {
      throw new Error("Last name is required");
    }

    if (lastName.trim().length === 0) {
      throw new Error("Last name cannot be empty");
    }

    if (lastName.length > 100) {
      throw new Error("Last name is too long");
    }

    return {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };
  })
  .handler(async ({ data }): Promise<UpdateProfileResult> => {
    try {
      const userId = requireUserId();

      await prisma.user.update({
        where: { id: userId },
        data: {
          Firstname: data.firstName,
          LastName: data.lastName,
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("Update profile error:", error);

      if (error instanceof Error) {
        if (
          error.message === "Not authenticated" ||
          error.message === "Session expired" ||
          error.message === "Invalid session"
        ) {
          return {
            success: false,
            error: "Please log in again",
          };
        }
      }

      return {
        success: false,
        error: "Failed to update profile. Please try again.",
      };
    }
  });
