let ftmlReady = false;

export async function initFtmlClient() {
  if (typeof window === "undefined") return;
  if (ftmlReady) return;

  if (import.meta.env.VITE_FTML_SERVER_URL) {
    (window as any).FTML_SERVER_URL =
      import.meta.env.VITE_FTML_SERVER_URL;
  }

  await import("@flexiformal/ftml-backend");
  ftmlReady = true;
  console.log("FTML client initialized");
}
