import { createServerFn } from "@tanstack/react-start";

export const lookupDefinitions = createServerFn<
  any,
  "POST",
  any,
  string[]
>({ method: "POST" }).handler(async (ctx) => {

  const payload = ctx.data as any;

  const concept =
    payload?.concept ??
    payload?.data?.concept ??
    "";

  if (!concept.trim()) {
    return [];
  }

  const safeTerm = concept.replace(/"/g, '\\"');

  const endpoint =
    process.env.VITE_MATHHUB_APP_URL ?? "https://mathhub.info/dashboard/query";

  const query = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX ulo: <http://mathhub.info/ulo#>

SELECT DISTINCT ?defined WHERE {
  ?def rdf:type ulo:definition .
  ?def ulo:defines ?defined .

  FILTER(
    CONTAINS(
      LCASE(STR(?defined)),
      LCASE("${safeTerm}")
    )
  )
}
`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-query",
      Accept: "application/sparql-results+json",
    },
    body: query,
  });

  const json = await res.json();

  return json?.results?.bindings?.map(
    (b: any) => b.defined?.value
  ) ?? [];
});
