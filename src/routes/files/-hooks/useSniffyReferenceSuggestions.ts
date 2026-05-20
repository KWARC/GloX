import { useSniffyReferenceSuggestions as useSharedSniffyReferenceSuggestions } from "@/hooks/useSniffyReferenceSuggestions";
import { queryClient } from "@/queryClient";
import { ExtractedItem } from "@/server/text-selection";
import { listDefinition } from "@/serverFns/extractDefinition.server";

type SniffyCatalog = Parameters<
  typeof useSharedSniffyReferenceSuggestions
>[0]["catalog"];

export function useSniffyReferenceSuggestions({
  documentId,
  extracts,
  sniffyCatalog,
}: {
  documentId: string;
  extracts: ExtractedItem[];
  sniffyCatalog: SniffyCatalog;
}) {
  return useSharedSniffyReferenceSuggestions({
    definitions: extracts,
    catalog: sniffyCatalog,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: ["definitions", documentId],
        refetchType: "none",
      }),
    refetchDefinitions: () =>
      queryClient.fetchQuery({
        queryKey: ["definitions", documentId],
        queryFn: () => listDefinition({ data: { documentId } }),
      }),
  });
}
