import { queryOptions } from '@tanstack/react-query'
import { getDocumentPages } from '@/serverFns/documentPages.server'

export type DocumentPage = {
  id: string
  pageNumber: number
  text: string
}

export const documentPagesQuery = (documentId: string) =>
  queryOptions<DocumentPage[]>({
    queryKey: ['document-pages', documentId],
    queryFn: async () => {
      return getDocumentPages({ data: { documentId } })
    },
  })
