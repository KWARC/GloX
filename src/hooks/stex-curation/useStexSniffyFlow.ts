import { useSniffyReferenceSuggestions } from "@/hooks/useSniffyReferenceSuggestions";
import { queryClient } from "@/queryClient";
import { FileIdentity } from "@/serverFns/latex.server";
import { ComponentProps } from "react";
import { ReferenceSuggestionDialog } from "@/components/ReferenceSuggestionDialog";
import { refetchFloDownBlocksByIdentity } from "@/hooks/stex-curation/useStexCurationData";

type SniffyCatalog = ComponentProps<
  typeof ReferenceSuggestionDialog
>["catalog"];

type SniffyFloDownBlock = Parameters<
  typeof useSniffyReferenceSuggestions
>[0]["floDownBlocks"][number];

export function useStexSniffyFlow(
  identity: FileIdentity,
  floDownBlocks: SniffyFloDownBlock[],
  sniffyCatalog: SniffyCatalog,
  staticCatalogLoading: boolean,
  staticCatalogError: Error | null,
  retryStaticCatalog: () => Promise<void>,
) {
  return useSniffyReferenceSuggestions({
    floDownBlocks,
    catalog: sniffyCatalog,
    catalogLoading: staticCatalogLoading,
    catalogError: staticCatalogError,
    retryCatalog: retryStaticCatalog,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: ["floDownBlocksByIdentity", identity],
        refetchType: "none",
      }),
    refetchFloDownBlocks: () => refetchFloDownBlocksByIdentity(identity),
  });
}
