import { useSniffyReferenceSuggestions as useSharedSniffyReferenceSuggestions } from "@/hooks/useSniffyReferenceSuggestions";
import { queryClient } from "@/queryClient";
import { ExtractedItem } from "@/server/text-selection";
import { listFloDownBlocks } from "@/serverFns/extractFloDownBlock.server";

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
    floDownBlocks: extracts,
    catalog: sniffyCatalog,
    catalogLoading: staticCatalogLoading,
    catalogError: staticCatalogError,
    retryCatalog: retryStaticCatalog,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: ["floDownBlocks", documentId],
        refetchType: "none",
      }),
    refetchFloDownBlocks: () =>
      queryClient.fetchQuery({
        queryKey: ["floDownBlocks", documentId],
        queryFn: () => listFloDownBlocks({ data: { documentId } }),
      }),
  });
}
