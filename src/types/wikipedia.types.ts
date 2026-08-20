export type WikipediaLanguage = "en" | "de" | "fr";

export type WikipediaSearchResultItem = {
  title: string;
  url: string;
};

export type WikipediaSearchOutput = {
  results: WikipediaSearchResultItem[];
};

export type WikipediaSearchInput = {
  symbolName: string;
  language: string;
};
