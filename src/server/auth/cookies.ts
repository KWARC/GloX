export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};

  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, decodeURIComponent(v.join("="))];
    }),
  );
}
