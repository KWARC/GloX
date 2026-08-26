import {
  WikipediaLanguage,
  WikipediaSearchResultItem,
} from "@/types/wikipedia.types";

const WIKIPEDIA_LANGUAGES = new Set<WikipediaLanguage>(["en", "de", "fr"]);

export function parseWikipediaLanguage(
  language: string,
): WikipediaLanguage | null {
  const normalized = language.trim().toLowerCase();
  if (WIKIPEDIA_LANGUAGES.has(normalized as WikipediaLanguage)) {
    return normalized as WikipediaLanguage;
  }
  return null;
}

export function buildWikipediaArticleUrl(
  language: WikipediaLanguage,
  pageKey: string,
): string {
  return `https://${language}.wikipedia.org/wiki/${encodeURIComponent(pageKey)}`;
}

export type { WikipediaLanguage, WikipediaSearchResultItem };
