import { logout } from "@/serverFns/logout.server";

export async function logoutUser() {
  try {
    await logout();
    // Reload page to clear client state
    window.location.reload();
  } catch (error) {
    console.error("Logout error:", error);
    // Force reload anyway to clear client state
    window.location.reload();
  }
}