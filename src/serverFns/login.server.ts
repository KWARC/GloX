import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import axios from "axios";
import bcrypt from "bcryptjs";

type LoginInput = {
  email: string;
  password: string;
};

type LoginResult =
  | { success: true }
  | { success: false; code: "NOT_SIGNED_UP" }
  | {
      success: false;
      error: "INVALID_PASSWORD" | "PASSWORD_LOGIN_DISABLED" | string;
    };

async function getAccessToken(
  email: string,
  firstName?: string,
  lastName?: string,
): Promise<string> {
  const lmpUrl = process.env.VITE_LMP_URL || process.env.NEXT_PUBLIC_LMP_URL;
  const serverSecret = process.env.SERVER_SECRET;

  if (!lmpUrl || !serverSecret) {
    throw new Error("Missing LMP configuration");
  }

  const res = await axios.get(`${lmpUrl}/get-email-access-token`, {
    params: {
      email,
      givenName: firstName ?? "",
      sn: lastName ?? "",
    },
    headers: {
      Authorization: serverSecret,
    },
  });

  return res.data;
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((data: LoginInput) => data)
  .handler(async ({ data }): Promise<LoginResult> => {
    const { email, password } = data;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { success: false, code: "NOT_SIGNED_UP" };
    }

    // Check if password login is allowed
    if (!user.passwordHash) {
      return { success: false, error: "PASSWORD_LOGIN_DISABLED" };
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return { success: false, error: "INVALID_PASSWORD" };
    }

    // Get access token from LMP
    const accessToken = await getAccessToken(
      email,
      user.Firstname ?? undefined,
      user.LastName ?? undefined,
    );

    // Set cookies (ALeA-compatible)
    setResponseHeader(
      "Set-Cookie",
      `access_token=${accessToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`,
    );
    setResponseHeader(
      "Set-Cookie",
      `is_logged_in=true; Path=/; SameSite=Lax; Max-Age=86400`,
    );

    return { success: true };
  });
