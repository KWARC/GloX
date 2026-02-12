import { ftmlSearchSymbols } from "@/server/ftml/searchSymbols";
import { searchSymbol } from "@/serverFns/symbol.server";
import { useQuery } from "@tanstack/react-query";

export type SymbolSearchResult =
  | {
      source: "DB";
      id: string;
      symbolName: string;
      futureRepo: string;
      filePath: string;
      fileName: string;
      language: string;
      resolvedUri?: string | null;
    }
  | { source: "MATHHUB"; uri: string };

const MIN_SEARCH_LENGTH = 2;
const MATHHUB_RESULTS_LIMIT = 15;

export function useSymbolSearch(query: string, enabled: boolean = true) {
  const isSearchValid = query.trim().length >= MIN_SEARCH_LENGTH;

  const { data: mathHubResults = [], isFetching: isSearchingMathHub } =
    useQuery({
      queryKey: ["symbol-search-mathhub", query],
      queryFn: () => ftmlSearchSymbols(query, MATHHUB_RESULTS_LIMIT),
      enabled: isSearchValid && enabled,
    });

  const { data: databaseResults = [], isFetching: isSearchingDatabase } =
    useQuery({
      queryKey: ["symbol-search-db", query],
      queryFn: () => searchSymbol({ data: query }),
      enabled: isSearchValid && enabled,
    });

  const combinedResults: SymbolSearchResult[] = [
    ...databaseResults.map(
      (s): SymbolSearchResult => ({
        source: "DB" as const,
        id: s.id,
        symbolName: s.symbolName,
        futureRepo: s.futureRepo,
        filePath: s.filePath,
        fileName: s.fileName,
        language: s.language,
        resolvedUri: s.resolvedUri,
      }),
    ),
    ...mathHubResults.map(
      (uri): SymbolSearchResult => ({
        source: "MATHHUB" as const,
        uri,
      }),
    ),
  ];

  return {
    results: combinedResults,
    isLoading: isSearchingMathHub || isSearchingDatabase,
    isReady: !isSearchingMathHub && !isSearchingDatabase,
    hasResults: combinedResults.length > 0,
  };
}
