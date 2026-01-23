import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import prisma from "@/lib/prisma";

type FakeLoginInput = {
  fakeId: string;
};

export const localFakeLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { fakeId: string }) => d)
  .handler(async ({ data }) => {
    const { fakeId } = data;
    await prisma.user.upsert({
      where: { id: fakeId },
      update: {},
      create: {
        id: fakeId,
        email: `${fakeId}@fake.local`,
        Firstname: `fake_${fakeId}`,
      },
    });
    setResponseHeader("Set-Cookie", [
      `access_token=fake-${data.fakeId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`,
      `is_logged_in=true; Path=/; SameSite=Lax; Max-Age=86400`,
    ]);

    return { redirectTo: "/" };
  });

export const fakeLogin = createServerFn({ method: "POST" })
  .inputValidator((d: FakeLoginInput) => d)
  .handler(async ({ data }) => {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      throw new Error("Fake login is disabled in production");
    }

    const { fakeId } = data;

    // Set fake auth cookies
    setResponseHeader(
      "Set-Cookie",
      `access_token=fake-${fakeId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`,
    );
    setResponseHeader(
      "Set-Cookie",
      `is_logged_in=true; Path=/; SameSite=Lax; Max-Age=86400`,
    );
    return { success: true };
  });
