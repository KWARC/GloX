import type { ExtractedItem } from "@/server/text-selection";
import { normalizeToRoot } from "@/types/floDown.types";
import { Catalog, Verbalization } from "../symbolic-catalog/catalogSearch";
import type { StaticCatalogDef } from "../symbolic-catalog/loadCatalog";
import { isEligibleForAutomaticSuggestion } from "./eligibility";
import { getStringContent, isDeclaredDefiniendum } from "./floDownTraversal";
import { walkInlines, getInlineContent } from "@/server/ftml/statementContent";
import type { CatalogEntry } from "./types";

export function buildSuggestionCatalog(
  floDownBlock: ExtractedItem,
  catalog: CatalogEntry[],
) {
  const suggestionCatalog = new Catalog<CatalogEntry, Verbalization>(
    floDownBlock.language,
    (entry) => entry.id,
  );

  for (const entry of catalog) {
    if (entry.sourceFloDownBlockId === floDownBlock.id) continue;
    if (entry.language !== floDownBlock.language) continue;

    for (const term of [entry.name, ...entry.aliases]) {
      if (!isEligibleForAutomaticSuggestion(term, floDownBlock.language)) {
        continue;
      }
      suggestionCatalog.addSymbVerb(entry, new Verbalization(term));
    }
  }

  return suggestionCatalog;
}
export function buildFloDownBlockCatalog(
  extracts: ExtractedItem[],
): CatalogEntry[] {
  return extracts.flatMap((extract) => {
    const root = normalizeToRoot(extract.statement);
    const entries: CatalogEntry[] = [];

    for (const block of root.content) {
      walkInlines(getInlineContent(block), (node) => {
        if (!isDeclaredDefiniendum(node)) return;

        const name = getStringContent(
          typeof node === "string" ? [node] : (node.content ?? []),
        ).trim() || node.uri;
        if (!name) return;

        entries.push({
          id: node.uri,
          name,
          canonicalForm: name.toLowerCase(),
          aliases: node.uri === name ? [] : [node.uri],
          symbolicUri: node.uri,
          language: extract.language,
          sourceFloDownBlockId: extract.id,
          statement: extract.statement,
          symRef: {
            source: "DB",
            symbolName: node.uri,
            futureRepo: extract.futureRepo,
            filePath: extract.filePath,
            fileName: extract.fileName,
            language: extract.language,
          },
        });
      });
    }

    return entries;
  });
}

export function buildFullCatalog(
  extracts: ExtractedItem[],
  staticCatalog: StaticCatalogDef[],
): CatalogEntry[] {
  const dynamic = buildFloDownBlockCatalog(extracts);
  const staticDefs = buildStaticCatalog(staticCatalog);

  return [...dynamic, ...staticDefs];
}

export function buildStaticCatalog(
  staticCatalog: StaticCatalogDef[],
): CatalogEntry[] {
  return staticCatalog.map(
    (d): CatalogEntry => ({
      id: d.id,
      name: d.name,
      canonicalForm: d.name.toLowerCase(),
      aliases: d.aliases,
      symbolicUri: d.symbolicUri,
      language: d.language,
      symRef: {
        source: "MATHHUB",
        uri: d.symbolicUri,
      },
    }),
  );
}
