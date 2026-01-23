// src/lib/flodown-client.ts
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
          resolve(window.floDown);
        } catch (e) {
          reject(e);
        }
      };

      script.onerror = () =>
        reject(new Error("Failed to load flodown.js"));

      document.head.appendChild(script);
    });
  }

  return floDownPromise;
}
