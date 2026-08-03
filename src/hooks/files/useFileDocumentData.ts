import { documentByIdQuery } from "@/queries/documentById";
import { MyDocument } from "@/queries/document";
import { documentPagesQuery } from "@/queries/documentPages";
import { buildStaticCatalog } from "@/server/symbolic-suggestions";
import { listFloDownBlocks } from "@/serverFns/extractFloDownBlock.server";
import { listMarkReferences } from "@/serverFns/markReference.server";
import { listStaticSymbolicCatalog } from "@/serverFns/symbolicCatalog.server";
import { useQuery } from "@tanstack/react-query";
import { DocumentPage } from "generated/prisma/browser";
import { useMemo } from "react";

type ExtractedDefinitions = Awaited<ReturnType<typeof listFloDownBlocks>>;
type MarkReferences = Awaited<ReturnType<typeof listMarkReferences>>;
type StaticCatalog = Awaited<ReturnType<typeof listStaticSymbolicCatalog>>;
type SniffyCatalog = ReturnType<typeof buildStaticCatalog>;

type FileDocumentData = {
  document: MyDocument | undefined;
  pages: DocumentPage[];
  extracts: ExtractedDefinitions;
  markReferences: MarkReferences;
  staticCatalog: StaticCatalog;
  sniffyCatalog: SniffyCatalog;
  staticCatalogLoading: boolean;
  staticCatalogError: Error | null;
  retryStaticCatalog: () => Promise<void>;
  docLoading: boolean;
  pagesLoading: boolean;
};

export function useFileDocumentData(documentId: string): FileDocumentData {
  const { data: document, isLoading: docLoading } = useQuery<MyDocument>(
    documentByIdQuery(documentId),
  );

  const { data: pages = [], isLoading: pagesLoading } = useQuery<DocumentPage[]>(
    documentPagesQuery(documentId),
  );

  const { data: extracts = [] } = useQuery({
    queryKey: ["floDownBlocks", documentId],
    queryFn: () => listFloDownBlocks({ data: { documentId } }),
  });

  const { data: markReferences = [] } = useQuery({
    queryKey: ["mark-references", documentId],
    queryFn: () => listMarkReferences({ data: { documentId } }),
  });

  const {
    data: staticCatalogData,
    isLoading: staticCatalogLoading,
    error: staticCatalogQueryError,
    refetch: refetchStaticCatalog,
  } = useQuery({
    queryKey: ["static-symbolic-catalog"],
    queryFn: () => listStaticSymbolicCatalog(),
  });

  const retryStaticCatalog = async () => {
    await refetchStaticCatalog();
  };

  const staticCatalog = staticCatalogData ?? [];
  const staticCatalogError =
    staticCatalogData === undefined && !staticCatalogLoading
      ? staticCatalogQueryError
      : null;

  const sniffyCatalog = useMemo(
    () => buildStaticCatalog(staticCatalog),
    [staticCatalog],
  );

  return {
    document,
    pages,
    extracts,
    markReferences,
    staticCatalog,
    sniffyCatalog,
    staticCatalogLoading,
    staticCatalogError,
    retryStaticCatalog,
    docLoading,
    pagesLoading,
  };
}
