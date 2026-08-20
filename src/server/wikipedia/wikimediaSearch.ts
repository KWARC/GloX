import {
  buildWikipediaArticleUrl,
  WikipediaLanguage,
} from "@/lib/wikipediaLanguage";
import { WikipediaSearchResultItem } from "@/types/wikipedia.types";

export const WIKIMEDIA_USER_AGENT =
  "GloX/1.0 (https://github.com/FAUstairs/GloX; contact: Abhishek Chugh / FAUstairs)";

type WikimediaSearchPage = {
  key?: string;
  title?: string;
};

type WikimediaSearchResponse = {
  pages?: WikimediaSearchPage[];
};

export {
  parseWikipediaLanguage,
  resolveWikipediaLanguageFromFilePath,
} from "@/lib/wikipediaLanguage";

export async function searchWikipediaArticles(
  symbolName: string,
  language: WikipediaLanguage,
): Promise<WikipediaSearchResultItem[]> {
  const query = symbolName.trim();
  if (!query) {
    return [];
  }

  const url = new URL(
    `https://${language}.wikipedia.org/w/rest.php/v1/search/page`,
  );
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "10");

  const response = await fetch(url, {
    headers: {
      "User-Agent": WIKIMEDIA_USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia search failed (${response.status})`);
  }

  const payload = (await response.json()) as WikimediaSearchResponse;
  const pages = payload.pages ?? [];

  return pages.flatMap((page) => {
    if (!page.title || !page.key) {
      return [];
    }

    return [
      {
        title: page.title,
        url: buildWikipediaArticleUrl(language, page.key),
      },
    ];
  });
}
