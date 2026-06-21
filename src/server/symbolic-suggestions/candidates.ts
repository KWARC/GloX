import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { parseUri } from "@/server/parseUri";
import { isSurfaceTerm } from "./searchScoring";
import type { CatalogEntry, SuggestedReferenceCandidate } from "./types";

export function candidateKey(candidate: SuggestedReferenceCandidate) {
  if (candidate.source === "DB") {
    return `DB:${candidate.definitionId ?? ""}`;
  }
  return `MATHHUB:${candidate.uri ?? ""}`;
}

export function getSuggestedReferenceCandidateKey(
  candidate: SuggestedReferenceCandidate,
) {
  return candidateKey(candidate);
}

export function toCandidate(
  entry: CatalogEntry,
  confidence: number,
): SuggestedReferenceCandidate {
  if (entry.symRef.source === "MATHHUB") {
    const parsed = parseUri(entry.symRef.uri);
    return {
      source: "MATHHUB",
      label: entry.name,
      path: formatMathHubPath(parsed),
      confidence,
      uri: entry.symRef.uri,
    };
  }

  return {
    source: "DB",
    label: entry.name,
    path: [
      entry.symRef.futureRepo,
      entry.symRef.filePath,
      entry.symRef.fileName,
      entry.symRef.language,
    ]
      .filter(Boolean)
      .join("/"),
    confidence,
    definitionId: entry.sourceDefinitionId,
  };
}

function formatMathHubPath(parsed: ReturnType<typeof parseUri>) {
  return [parsed.archive, parsed.filePath, parsed.fileName, parsed.language]
    .filter(Boolean)
    .join("/");
}

export function getSearchTerms(entry: CatalogEntry) {
  return [entry.name, ...entry.aliases].filter(isSurfaceTerm);
}

export function buildCandidateSymRefMap(
  catalog: CatalogEntry[],
  currentDefinitionId?: string,
): Record<string, UnifiedSymbolicReference> {
  const candidateSymRefs: Record<string, UnifiedSymbolicReference> = {};

  for (const entry of catalog) {
    if (
      entry.symRef.source === "DB" &&
      entry.sourceDefinitionId === currentDefinitionId
    ) {
      continue;
    }

    const candidate = toCandidate(entry, 1);
    candidateSymRefs[getSuggestedReferenceCandidateKey(candidate)] =
      entry.symRef;
  }

  return candidateSymRefs;
}
