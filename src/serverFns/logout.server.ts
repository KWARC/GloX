import { createServerFn } from "@tanstack/react-start";
import { clearSession } from "@/server/authSession";

export const logout = createServerFn({ method: "POST" }).handler(
  async () => {
    clearSession();
    return { success: true };
  }
);