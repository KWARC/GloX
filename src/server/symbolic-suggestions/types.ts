import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";

export type CatalogEntry = {
  id: string;
  name: string;
  canonicalForm: string;
  aliases: string[];
  symbolicUri: string;
  language?: string;
  sourceDefinitionId?: string;
  symRef: UnifiedSymbolicReference;
};

export type SuggestedReferenceCandidate = {
  source: "DB" | "MATHHUB";
  label: string;
  path?: string;
  confidence: number;
  definitionId?: string;
  uri?: string;
};

export type SuggestedReference = {
  text: string;
  context: string;
  nodePath: number[];
  localStartOffset: number;
  localEndOffset: number;
  plainStartOffset: number;
  plainEndOffset: number;
  candidates: SuggestedReferenceCandidate[];
};

export type SuggestedReferenceSession = {
  suggestions: SuggestedReference[];
  candidateSymRefs: Record<string, UnifiedSymbolicReference>;
};

export type SuggestionIgnoreOptions = {
  stemsToIgnore?: Set<string>;
  wordsToIgnore?: Set<string>;
  symbolsToIgnore?: Set<string>;
};
