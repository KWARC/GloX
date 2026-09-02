import { readFile } from "node:fs/promises";
import path from "node:path";
import { getModulesDir } from "@/server/modules/moduleCatalog";
import type { CatalogDuplicatesIndex } from "@/server/modules/moduleDuplicateHints";

let loadPromise: Promise<CatalogDuplicatesIndex | null> | null = null;
let cached: CatalogDuplicatesIndex | null | undefined;

export function resetDuplicateIndexForTests(): void {
  loadPromise = null;
  cached = undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseIndex(raw: unknown): CatalogDuplicatesIndex | null {
  if (!isRecord(raw) || !isRecord(raw.modules)) return null;
  if (raw.version !== 1) return null;
  return raw as CatalogDuplicatesIndex;
}

async function readIndexFile(): Promise<CatalogDuplicatesIndex | null> {
  const filePath = path.join(getModulesDir(), "duplicates.json");
  try {
    const text = await readFile(filePath, "utf8");
    return parseIndex(JSON.parse(text));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function loadCatalogDuplicatesIndex(): Promise<CatalogDuplicatesIndex | null> {
  if (cached !== undefined) return cached;
  if (!loadPromise) {
    loadPromise = readIndexFile().then((index) => {
      cached = index;
      return index;
    });
  }
  return loadPromise;
}
