import { localFakeLogin } from "@/serverFns/fakeLogin.server";

export async function fakeLoginUsingRedirect(
  fakeId: string,
  returnBackUrl?: string,
) {
  const hostname = window.location.hostname;
  const isLocal = hostname === "localhost" || hostname.endsWith(".local");

  if (isLocal) {
    console.log("[FAKE LOGIN] Using LOCAL serverFn");

   const result= await localFakeLogin({ data: { fakeId } });

    // 🔴 THIS IS THE FIX
    window.location.href = returnBackUrl || result.redirectTo || "/";
    return;
  }

  const target =
    returnBackUrl && !returnBackUrl.includes("/login")
      ? returnBackUrl
      : window.location.origin;

  window.location.replace(
    `${import.meta.env.VITE_AUTH_SERVER_URL}/fake-login` +
      `?fake-id=${fakeId}` +
      `&target=${encodeURIComponent(target)}`
  );
}
