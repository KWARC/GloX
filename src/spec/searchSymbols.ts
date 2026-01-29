export async function ftmlSearchSymbols(
  query: string,
  limit = 5,
): Promise<string[]> {
  if (!query.trim()) return [];

  const server = import.meta.env.VITE_FTML_SERVER_URL;
  if (!server) {
    console.warn("FTML server URL not configured");
    return [];
  }

  const params = new URLSearchParams({
    query,
    num_results: String(limit),
  });

  const url = `${server}/api/search_symbols`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!resp.ok) {
      console.warn("FTML search failed:", resp.status, resp.statusText);
      return [];
    }

    const json = (await resp.json()) as [string, unknown[]][] | undefined;

    if (!Array.isArray(json)) return [];

    return json.map(([symbolUri]) => symbolUri);
  } catch (err) {
    console.warn("FTML search crashed:", err);
    return [];
  }
}
