import { useSniffyReferenceSuggestions as useSharedSniffyReferenceSuggestions } from "@/hooks/useSniffyReferenceSuggestions";
import { queryClient } from "@/queryClient";
import { ExtractedItem } from "@/server/text-selection";
import { listDefinition } from "@/serverFns/extractDefinition.server";

type SniffyCatalog = Parameters<
  typeof useSharedSniffyReferenceSuggestions
>[0]["catalog"];

export function useFileSniffyReferenceSuggestions({
  documentId,
  extracts,
  sniffyCatalog,
  staticCatalogLoading,
  staticCatalogError,
  retryStaticCatalog,
}: {
  documentId: string;
  extracts: ExtractedItem[];
  sniffyCatalog: SniffyCatalog;
  staticCatalogLoading: boolean;
  staticCatalogError: Error | null;
  retryStaticCatalog: () => Promise<void>;
}) {
  return useSharedSniffyReferenceSuggestions({
    definitions: extracts,
    catalog: sniffyCatalog,
    catalogLoading: staticCatalogLoading,
    catalogError: staticCatalogError,
    retryCatalog: retryStaticCatalog,
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
