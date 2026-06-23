import type { ExtractedItem } from "@/server/text-selection";
import { normalizeToRoot } from "@/types/ftml.types";
import { Catalog, Verbalization } from "../symbolic-catalog/catalogSearch";
import type { StaticCatalogDef } from "../symbolic-catalog/loadCatalog";
import { isEligibleForAutomaticSuggestion } from "./eligibility";
import { getStringContent, isDeclaredDefiniendum, walkNodes } from "./ftmlTraversal";
import type { CatalogEntry } from "./types";

export function buildSuggestionCatalog(
  definition: ExtractedItem,
  catalog: CatalogEntry[],
) {
  const suggestionCatalog = new Catalog<CatalogEntry, Verbalization>(
    definition.language,
    (entry) => entry.id,
  );

  for (const entry of catalog) {
    if (entry.sourceDefinitionId === definition.id) continue;
    if (entry.language !== definition.language) continue;

    for (const term of [entry.name, ...entry.aliases]) {
      if (!isEligibleForAutomaticSuggestion(term, definition.language)) {
        continue;
      }
      suggestionCatalog.addSymbVerb(entry, new Verbalization(term));
    }
  }

  return suggestionCatalog;
}
export function buildDefinitionCatalog(
  extracts: ExtractedItem[],
): CatalogEntry[] {
  return extracts.flatMap((extract) => {
    const root = normalizeToRoot(extract.statement);
    const entries: CatalogEntry[] = [];

    walkNodes(root, (node) => {
      if (!isDeclaredDefiniendum(node)) return;

      const name = getStringContent(node.content).trim() || node.uri;
      if (!name) return;

      entries.push({
        id: node.uri,
        name,
        canonicalForm: name.toLowerCase(),
        aliases: node.uri === name ? [] : [node.uri],
        symbolicUri: node.uri,
        language: extract.language,
        sourceDefinitionId: extract.id,
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

    return entries;
  });
}

export function buildFullCatalog(
  extracts: ExtractedItem[],
  staticCatalog: StaticCatalogDef[],
): CatalogEntry[] {
  const dynamic = buildDefinitionCatalog(extracts);
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
