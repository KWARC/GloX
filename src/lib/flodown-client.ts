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
        // already initialized
        // @ts-ignore
        resolve(window.floDown);
        return;
      }

      const script = document.createElement("script");
      script.src = "/flodown/flodown.js";
      script.async = true;

      script.onload = async () => {
        try {
          // IMPORTANT: initialize WASM
          // @ts-ignore
          await window.floDown();

          // return namespace, not initializer result
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
