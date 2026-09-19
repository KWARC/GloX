import { currentUser } from "@/server/auth/currentUser";
import { roleMayReplaceLocalSymbolWithMathHub } from "@/server/ftml/replaceLocalSymbolWithMathHub";

export type AdminOrCurator = {
  id: string;
  role: "ADMIN" | "CURATOR";
  displayName: string;
};

export async function requireAdminOrCurator(): Promise<AdminOrCurator> {
  const userRes = await currentUser();
  if (!userRes.loggedIn) throw new Error("Unauthorized");
  if (!roleMayReplaceLocalSymbolWithMathHub(userRes.user.role)) {
    throw new Error("Forbidden");
  }
  return {
    id: userRes.user.id,
    role: userRes.user.role as "ADMIN" | "CURATOR",
    displayName:
      [userRes.user.firstName, userRes.user.lastName].filter(Boolean).join(" ") ||
      userRes.user.email,
  };
}
