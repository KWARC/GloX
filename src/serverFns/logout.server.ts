import { clearSession } from "@/server/authSession";
import { createServerFn } from "@tanstack/react-start";

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  clearSession();
  return { success: true };
});
