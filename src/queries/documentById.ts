import { queryOptions } from '@tanstack/react-query'
import { getDocumentById } from '@/serverFns/documentById.server'
import type { MyDocument } from './document'

export const documentByIdQuery = (id: string) =>
  queryOptions<MyDocument>({
    queryKey: ['document', id],
    queryFn: async () => {
      return await getDocumentById({ data: { id } })
    },
  })
