import { useSniffyReferenceSuggestions } from "@/hooks/useSniffyReferenceSuggestions";
import { queryClient } from "@/queryClient";
import { ExtractedItem } from "@/server/text-selection";
import { getModuleDescriptionPage } from "@/serverFns/moduleDescription.server";
import {
  moduleDefinitionsToExtractedItems,
  type ModuleDefinitionBlock,
} from "@/lib/moduleDefinitionExtracts";

type SniffyCatalog = Parameters<
  typeof useSniffyReferenceSuggestions
>[0]["catalog"];

export function useModuleSniffyFlow({
  moduleId,
  extracts,
  sniffyCatalog,
  staticCatalogLoading,
  staticCatalogError,
  retryStaticCatalog,
}: {
  moduleId: string;
  extracts: ExtractedItem[];
  sniffyCatalog: SniffyCatalog;
  staticCatalogLoading: boolean;
  staticCatalogError: Error | null;
  retryStaticCatalog: () => Promise<void>;
}) {
  return useSniffyReferenceSuggestions({
    floDownBlocks: extracts,
    catalog: sniffyCatalog,
    catalogLoading: staticCatalogLoading,
    catalogError: staticCatalogError,
    retryCatalog: retryStaticCatalog,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: ["module-description", moduleId],
        refetchType: "none",
      }),
    refetchFloDownBlocks: async () => {
      const page = await getModuleDescriptionPage({ data: { moduleId } });
      const blocks =
        page.moduleDescription?.definitionBlocks ?? ([] as ModuleDefinitionBlock[]);
      return moduleDefinitionsToExtractedItems(blocks);
    },
  });
}
