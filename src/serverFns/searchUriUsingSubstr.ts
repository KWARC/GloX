import { createServerFn } from "@tanstack/react-start";
import { buildSearchUriQuery, createSafeFlamsQuery, createUriParamMapping } from "@/spec/uriSearch";

export const searchUriUsingSubstr = createServerFn({
  method: "POST",
}).handler(async (ctx) => {
  // ✅ SAFE extraction (TanStack-Start-compatible)
  const data = (ctx as any).data as { input?: string } | undefined;
  const input = data?.input;

  if (!input) {
    console.warn("searchUriUsingSubStr called without input");
    return [];
  }

  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return [];

  const parameterizedQuery = buildSearchUriQuery(parts);
  const query = createSafeFlamsQuery(
    parameterizedQuery,
    createUriParamMapping(parts)
  );

  const resp = await fetch(
    `${process.env.VITE_MATHHUB_APP_URL}/api/backend/query`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ query }),
    }
  );

  const json = await resp.json();
  return json?.results?.bindings.map((b: any) => b.uri?.value) ?? [];
});
