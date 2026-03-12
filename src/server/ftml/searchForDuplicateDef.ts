import { ftmlSearchSymbols } from "@/server/ftml/searchSymbols"
import { useQuery } from "@tanstack/react-query"

const MIN_SEARCH_LENGTH = 2
const LIMIT = 15

export function searchForDuplicateDefinition(query: string) {
  const valid = query.trim().length >= MIN_SEARCH_LENGTH

  const { data = [], isFetching } = useQuery({
    queryKey: ["mathhub-symbol-search", query],
    queryFn: () => ftmlSearchSymbols(query, LIMIT),
    enabled: valid,
  })

  return {
    results: data,
    loading: isFetching,
    ready: !isFetching,
    hasResults: data.length > 0,
  }
}