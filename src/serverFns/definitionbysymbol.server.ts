import { getDefinitionBySymbol } from "@/serverFns/symbol.server";
import { Definition } from "@/types/Semantic.types";
import { useQuery } from "@tanstack/react-query";

export function useDefinitionBySymbol(symbolName: string): {
  data: Definition | null;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ["definition-by-symbol", symbolName],
    queryFn: () => getDefinitionBySymbol({ data: symbolName }),
    staleTime: Infinity,
  });
  return { data: data ?? null, isLoading };
}
