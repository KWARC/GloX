import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export const logout = createServerFn({ method: "POST" })
  .handler(async () => {
    setResponseHeader("Set-Cookie", [
      // MUST match original cookie attributes
      "access_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
      "is_logged_in=; Path=/; SameSite=Lax; Max-Age=0",
    ]);

    return { redirectTo: "/login" };
  });
