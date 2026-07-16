import { useSniffyReferenceSuggestions } from "@/hooks/useSniffyReferenceSuggestions";
import { queryClient } from "@/queryClient";
import { FileIdentity } from "@/serverFns/latex.server";
import { ComponentProps } from "react";
import { ReferenceSuggestionDialog } from "@/components/ReferenceSuggestionDialog";
import { refetchDefinitionsByIdentity } from "@/hooks/stex-curation/useStexCurationData";

type SniffyCatalog = ComponentProps<
  typeof ReferenceSuggestionDialog
>["catalog"];

type SniffyDefinition = Parameters<
  typeof useSniffyReferenceSuggestions
>[0]["definitions"][number];

export function useStexSniffyFlow(
  identity: FileIdentity,
  definitions: SniffyDefinition[],
  sniffyCatalog: SniffyCatalog,
  staticCatalogLoading: boolean,
  staticCatalogError: Error | null,
  retryStaticCatalog: () => Promise<void>,
) {
  return useSniffyReferenceSuggestions({
    definitions,
    catalog: sniffyCatalog,
    catalogLoading: staticCatalogLoading,
    catalogError: staticCatalogError,
    retryCatalog: retryStaticCatalog,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: ["definitionsByIdentity", identity],
        refetchType: "none",
      }),
    refetchDefinitions: () => refetchDefinitionsByIdentity(identity),
  });
}
