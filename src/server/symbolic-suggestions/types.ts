import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import type { FloDownStatement } from "@/types/floDown.types";

export type CatalogEntry = {
  id: string;
  name: string;
  canonicalForm: string;
  aliases: string[];
  symbolicUri: string;
  language?: string;
  sourceFloDownBlockId?: string;
  statement?: FloDownStatement;
  symRef: UnifiedSymbolicReference;
};

export type SuggestedReferenceCandidate = {
  source: "DB" | "MATHHUB";
  label: string;
  path?: string;
  confidence: number;
  floDownBlockId?: string;
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
