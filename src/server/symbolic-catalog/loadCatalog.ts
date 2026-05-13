import fs from "node:fs";
import path from "node:path";

type RawCatalogEntry = {
  verb?: unknown;
  symbol?: unknown;
};

export type StaticCatalogDef = {
  id: string;
  name: string;
  aliases: string[];
  symbolicUri: string;
};

let cache: StaticCatalogDef[] | null = null;

function readFile(): StaticCatalogDef[] {
  try {
    const p = path.join(process.cwd(), "catalog.json");
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);
    const byArchive = parsed?.catalog_by_archive;

    if (!byArchive || typeof byArchive !== "object") return [];

    return Object.values(byArchive)
      .flatMap((entries) => (Array.isArray(entries) ? entries : []))
      .flatMap((entry) => {
        const item = entry as RawCatalogEntry;
        if (typeof item.verb !== "string" || typeof item.symbol !== "string") {
          return [];
        }

        return [
          {
            id: item.symbol,
            name: item.verb,
            aliases: [],
            symbolicUri: item.symbol,
          },
        ];
      });
  } catch {
    return [];
  }
}

export function getStaticCatalog(): StaticCatalogDef[] {
  if (!cache) cache = readFile();
  return cache;
}

export function clearStaticCatalogCacheForTests() {
  cache = null;
}
