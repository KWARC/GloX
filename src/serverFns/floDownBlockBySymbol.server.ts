import { getFloDownBlockBySymbol } from "@/serverFns/symbol.server";
import { FloDownBlockBySymbol } from "@/types/Semantic.types";
import { useQuery } from "@tanstack/react-query";

export function useFloDownBlockBySymbol(symbolName: string): {
  data: FloDownBlockBySymbol | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["logical-paragraph-by-symbol", symbolName],
    queryFn: () => getFloDownBlockBySymbol({ data: symbolName }),
    staleTime: Infinity,
  });
  return { data: data ?? null, isLoading };
}
