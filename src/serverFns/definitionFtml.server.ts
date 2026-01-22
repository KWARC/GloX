import { createServerFn } from "@tanstack/react-start";
import { loadDefinitionForFtml } from "@/server/ftml/buildDefinitionFtml";
import { buildDefinitionFtml } from "@/server/ftml/buildDefinitionFtml";

export const getDefinitionFtml = createServerFn({ method: "GET" })
  .inputValidator((definitionId: string) => definitionId)
  .handler(async ({ data: definitionId }) => {
    const def = await loadDefinitionForFtml(definitionId);
    const ftml = buildDefinitionFtml(def);

    return { ftml };
  });
