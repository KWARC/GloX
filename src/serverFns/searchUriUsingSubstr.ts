import {
  buildSearchUriQuery,
  createSafeFlamsQuery,
  createUriParamMapping,
} from "@/spec/uriSearch";
import { createServerFn } from "@tanstack/react-start";

type SearchUriInput = {
  input: string;
};

type MathHubBinding = {
  uri?: {
    value?: string;
  };
};

type MathHubResponse = {
  results?: {
    bindings?: MathHubBinding[];
  };
};

export const searchUriUsingSubstr = createServerFn({ method: "POST" })
  .inputValidator((data: SearchUriInput) => data)
  .handler(async ({ data }): Promise<string[]> => {
    const input = data.input;

    if (!input.trim()) {
      return [];
    }

    const parts = input.split(/\s+/).filter(Boolean);
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

    const json: MathHubResponse = await resp.json();

    return (
      json.results?.bindings
        ?.map((b) => b.uri?.value)
        .filter((v): v is string => typeof v === "string") ?? []
    );
  });
