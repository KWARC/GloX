import { useSniffyReferenceSuggestions } from "@/hooks/useSniffyReferenceSuggestions";
import { queryClient } from "@/queryClient";
import { FileIdentity } from "@/serverFns/latex.server";
import { ComponentProps } from "react";
import { ReferenceSuggestionDialog } from "../ReferenceSuggestionDialog";
import { refetchDefinitionsByIdentity } from "./useStexCurationData";

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
) {
  return useSniffyReferenceSuggestions({
    definitions,
    catalog: sniffyCatalog,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: ["definitionsByIdentity", identity],
        refetchType: "none",
      }),
    refetchDefinitions: () => refetchDefinitionsByIdentity(identity),
  });
}
