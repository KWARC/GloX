import { createServerFn } from "@tanstack/react-start";
import { getResponse } from "@tanstack/react-start/server";

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const res = getResponse();

  res.headers.append(
    "Set-Cookie",
    "access_token=; Path=/; Max-Age=0; SameSite=Lax",
  );

  res.headers.append(
    "Set-Cookie",
    "is_logged_in=; Path=/; Max-Age=0; SameSite=Lax",
  );

  return { success: true };
});
