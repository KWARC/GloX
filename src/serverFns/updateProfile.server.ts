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
  .inputValidator((data): UpdateProfileInput => {
    const input = data as UpdateProfileInput;

    return {
      firstName: String(input?.firstName ?? "").trim(),
      lastName: String(input?.lastName ?? "").trim(),
    };
  })

  .handler(async ({ data }): Promise<UpdateProfileResult> => {
    try {
      if (!data.firstName || !data.lastName) {
        return { success: false, error: "Invalid input" };
      }

      const userId = requireUserId();

      await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
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
