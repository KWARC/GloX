import { currentUser } from "@/server/auth/currentUser";
import {
  parseWikipediaLanguage,
  searchWikipediaArticles,
} from "@/server/wikipedia/wikimediaSearch";
import {
  WikipediaSearchInput,
  WikipediaSearchOutput,
} from "@/types/wikipedia.types";
import { createServerFn } from "@tanstack/react-start";

export const searchWikipediaForSymbol = createServerFn({ method: "POST" })
  .inputValidator((data: WikipediaSearchInput) => {
    if (!data.symbolName?.trim()) {
      throw new Error("symbolName is required");
    }
    if (!data.language?.trim()) {
      throw new Error("language is required");
    }
    return data;
  })
  .handler(async ({ data }): Promise<WikipediaSearchOutput> => {
    const user = await currentUser();
    if (!user.loggedIn) {
      throw new Error("Unauthorized");
    }

    const language = parseWikipediaLanguage(data.language);
    if (!language) {
      return { results: [] };
    }

    try {
      const results = await searchWikipediaArticles(data.symbolName, language);
      return { results };
    } catch {
      throw new Error("Wikipedia search failed");
    }
  });
