import { createServerFn } from "@tanstack/react-start";
import { loadDefinitionForFtml, buildDefinitionFtml } from "@/server/ftml/buildDefinitionFtml";

export const getDefinitionFtml = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data }) => {
    const def = await loadDefinitionForFtml(data);
    if (!def) throw new Error("Definition not found");
    return buildDefinitionFtml(def);
  });
