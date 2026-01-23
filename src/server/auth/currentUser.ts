import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    })
  );
}

export const currentUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const cookies = parseCookies(request.headers.get("cookie"));

    const token = cookies["access_token"];
    if (!token) {
      return { loggedIn: false };
    }

    // Fake login
    if (token.startsWith("fake-")) {
      const fakeId = token.replace("fake-", "");

      return {
        loggedIn: true,
        user: {
          id: fakeId,
          email: `${fakeId}@fake.local`,
        },
      };
    }

    // Real login (placeholder — adapt later)
    return {
      loggedIn: true,
      user: {
        email: "unknown",
      },
    };
  }
);
