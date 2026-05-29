import { documentByIdQuery } from "@/queries/documentById";
import { documentPagesQuery } from "@/queries/documentPages";
import { buildStaticCatalog } from "@/server/symbolic-suggestions";
import { listDefinition } from "@/serverFns/extractDefinition.server";
import { listStaticSymbolicCatalog } from "@/serverFns/symbolicCatalog.server";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useFileDocumentData(documentId: string) {
  const { data: document, isLoading: docLoading } = useQuery(
    documentByIdQuery(documentId),
  );

  const { data: pages = [], isLoading: pagesLoading } = useQuery(
    documentPagesQuery(documentId),
  );

  const { data: extracts = [] } = useQuery({
    queryKey: ["definitions", documentId],
    queryFn: () => listDefinition({ data: { documentId } }),
  });

  const { data: staticCatalog = [] } = useQuery({
    queryKey: ["static-symbolic-catalog"],
    queryFn: () => listStaticSymbolicCatalog(),
  });

  const sniffyCatalog = useMemo(
    () => buildStaticCatalog(staticCatalog),
    [staticCatalog],
  );

  return {
    document,
    pages,
    extracts,
    staticCatalog,
    sniffyCatalog,
    docLoading,
    pagesLoading,
  };
}
