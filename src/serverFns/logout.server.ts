import { clearSession } from "@/server/auth/authSession";
import { createServerFn } from "@tanstack/react-start";

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  clearSession();
  return { success: true };
});
