import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/server/authSession'

export const getDocumentById = createServerFn({ method: 'POST' }).handler(
  async (ctx) => {
    if (!ctx.data || typeof ctx.data !== 'object' || !('id' in ctx.data)) {
      throw new Error('Invalid request')
    }

    const { id } = ctx.data as { id: string }

    const userId = getSessionUser()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const doc = await prisma.document.findFirst({
      where: { id, userId },
    })

    if (!doc) {
      throw new Error('Document not found')
    }

    return doc
  }
)
