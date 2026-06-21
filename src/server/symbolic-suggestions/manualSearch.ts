import { getSearchTerms, getSuggestedReferenceCandidateKey, toCandidate } from "./candidates";
import { scoreCandidate } from "./searchScoring";
import type { CatalogEntry, SuggestedReferenceCandidate } from "./types";

export function searchReferenceCandidates(
  query: string,
  catalog: CatalogEntry[],
  currentDefinitionId?: string,
): SuggestedReferenceCandidate[] {
  const seen = new Set<string>();

  return catalog
    .flatMap((entry) => {
      if (
        entry.symRef.source === "DB" &&
        entry.sourceDefinitionId === currentDefinitionId
      ) {
        return [];
      }

      const terms = getSearchTerms(entry);
      if (!terms.length) return [];

      const score = scoreCandidate(query, terms);
      if (score < 0.5) return [];

      const candidate = toCandidate(entry, score);
      const key = getSuggestedReferenceCandidateKey(candidate);
      if (seen.has(key)) return [];
      seen.add(key);

      return [{ candidate, score }];
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.candidate.label.localeCompare(b.candidate.label),
    )
    .slice(0, 10)
    .map(({ candidate }) => candidate);
}
