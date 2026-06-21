import { stringToStemmedWordSequenceSimplified } from "../symbolic-catalog/catalogSearch";

const DEFAULT_AUTOMATIC_IGNORED_SINGLE_TOKENS: Record<string, Set<string>> = {
  en: new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "being",
    "but",
    "by",
    "for",
    "from",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "not",
    "of",
    "on",
    "or",
    "than",
    "that",
    "the",
    "then",
    "these",
    "this",
    "those",
    "to",
    "was",
    "were",
    "with",
  ]),
};

export function isEligibleForAutomaticSuggestion(
  term: string,
  language: string,
) {
  const tokens = stringToStemmedWordSequenceSimplified(term, language);
  if (tokens.length === 0) return false;
  if (tokens.length !== 1) return true;

  const surface = (term.match(/[\p{L}\p{N}_]+/gu) ?? [])[0] ?? "";
  if (Array.from(surface).length <= 1) return false;

  return !DEFAULT_AUTOMATIC_IGNORED_SINGLE_TOKENS[language]?.has(
    surface.toLowerCase(),
  );
}
