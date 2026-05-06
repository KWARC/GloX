import { getStaticCatalog } from "@/server/symbolic-catalog/loadCatalog";
import { createServerFn } from "@tanstack/react-start";

export const listStaticSymbolicCatalog = createServerFn({
  method: "GET",
}).handler(async () => getStaticCatalog());
