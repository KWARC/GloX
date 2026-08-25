export const FLODOWN_BACKEND_URL = "https://mathhub.info";

// Remaining issue (E-FTML-05): hover on GloX-local symbols is not served by this backend's
// /content/fragment. MathHub 404s those URIs. Local hover depends on D-FTML-03 (live definition
// document), not on changing this URL.

let floDownPromise: Promise<any> | null = null;

export function initFloDown(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject("Not in browser");
  }

  if (!floDownPromise) {
    floDownPromise = new Promise((resolve, reject) => {
      // @ts-ignore
      if (window.floDown?.FloDown) {
        // @ts-ignore
        window.floDown.setBackendUrl(FLODOWN_BACKEND_URL);
        // @ts-ignore
        resolve(window.floDown);
        return;
      }

      const script = document.createElement("script");
      script.src = "/flodown/flodown.js";
      script.async = true;

      script.onload = async () => {
        try {
          // @ts-ignore
          await window.floDown();
          // @ts-ignore
          window.floDown.setBackendUrl(FLODOWN_BACKEND_URL);
          // @ts-ignore
          resolve(window.floDown);
        } catch (e) {
          reject(e);
        }
      };

      script.onerror = () => reject(new Error("Failed to load flodown.js"));

      document.head.appendChild(script);
    });
  }

  return floDownPromise;
}
