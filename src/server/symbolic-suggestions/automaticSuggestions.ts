import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import type { ExtractedItem } from "@/server/text-selection";
import { normalizeToRoot } from "@/types/ftml.types";
import { Catalog, Verbalization } from "../symbolic-catalog/catalogSearch";
import { buildSuggestionCatalog } from "./catalogBuilders";
import { candidateKey, toCandidate } from "./candidates";
import { buildContext, extractPlainText, resolveConflicts, walkTextNodes } from "./ftmlTraversal";
import type {
  CatalogEntry,
  SuggestedReference,
  SuggestedReferenceSession,
  SuggestionIgnoreOptions,
} from "./types";

export function getRankedCandidates(
  entries: CatalogEntry[],
  catalog: Catalog<CatalogEntry, Verbalization>,
) {
  return [...entries].sort((a, b) => {
    const usageDifference =
      catalog.getSymbVerbs(b).length - catalog.getSymbVerbs(a).length;
    if (usageDifference !== 0) return usageDifference;
    return a.symbolicUri < b.symbolicUri
      ? -1
      : a.symbolicUri > b.symbolicUri
        ? 1
        : 0;
  });
}
export function findAllCatalogMatches(
  catalog: Catalog<CatalogEntry, Verbalization>,
  text: string,
  ignoreOptions: SuggestionIgnoreOptions,
) {
  const matches: Array<{
    start: number;
    end: number;
    text: string;
    entries: CatalogEntry[];
  }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const match = catalog.findFirstMatch(text.slice(cursor), ignoreOptions);
    if (!match) break;

    const start = cursor + match.start;
    const end = cursor + match.end;
    matches.push({
      start,
      end,
      text: text.slice(start, end),
      entries: match.candidates.map(([entry]) => entry),
    });

    cursor += Math.max(match.end, match.start + 1);
  }

  return matches;
}
export function suggestRefsForDefinition(
  definition: ExtractedItem,
  catalog: CatalogEntry[],
  ignoreOptions: SuggestionIgnoreOptions = {},
): SuggestedReferenceSession {
  const root = normalizeToRoot(definition.statement);
  const definitionText = extractPlainText(definition.statement);
  const out: SuggestedReference[] = [];
  const candidateSymRefs: Record<string, UnifiedSymbolicReference> = {};
  const suggestionCatalog = buildSuggestionCatalog(definition, catalog);

  walkTextNodes(root, (textNode, plainOffset, nodePath) => {
    for (const match of findAllCatalogMatches(
      suggestionCatalog,
      textNode,
      ignoreOptions,
    )) {
      const ranked = getRankedCandidates(match.entries, suggestionCatalog);
      const candidates = ranked.map((target) => {
        const candidate = toCandidate(target, 1);
        candidateSymRefs[candidateKey(candidate)] = target.symRef;
        return candidate;
      });

      if (!candidates.length) continue;

      const plainStartOffset = plainOffset + match.start;
      const plainEndOffset = plainOffset + match.end;

      out.push({
        text: match.text,
        context: buildContext(definitionText, plainStartOffset, plainEndOffset),
        nodePath,
        localStartOffset: match.start,
        localEndOffset: match.end,
        plainStartOffset,
        plainEndOffset,
        candidates,
      });
    }
  });

  return {
    suggestions: resolveConflicts(out),
    candidateSymRefs,
  };
}
