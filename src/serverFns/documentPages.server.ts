import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/server/authSession'

export const getDocumentPages = createServerFn({ method: 'POST' }).handler(
  async (ctx) => {
    if (!ctx.data || !('documentId' in ctx.data)) {
      throw new Error('Missing documentId')
    }

    const { documentId } = ctx.data as { documentId: string }

    const userId = getSessionUser()
    if (!userId) throw new Error('Not authenticated')

    return prisma.documentPage.findMany({
      where: {
        documentId,
        document: { userId },
      },
      orderBy: { pageNumber: 'asc' },
    })
  }
)
