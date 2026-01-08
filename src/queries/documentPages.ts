import { getDocumentPages } from "@/serverFns/documentPages.server";
import { queryOptions } from "@tanstack/react-query";
import { DocumentPage } from "generated/prisma/browser";

export const documentPagesQuery = (documentId: string) =>
  queryOptions<DocumentPage[]>({
    queryKey: ["document-pages", documentId],
    queryFn: async () => {
      return getDocumentPages({ data: { documentId } });
    },
  });
