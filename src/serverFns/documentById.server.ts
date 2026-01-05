import { createServerFn } from '@tanstack/react-start'
import prisma from '@/lib/prisma'
import { getSessionUser } from '@/server/authSession'

export const getDocumentById = createServerFn({ method: 'GET' }).handler(
  async ({ data }: { data: { id: string } }) => {
    const userId = getSessionUser()
    if (!userId) {
      throw new Error('Not authenticated')
    }

    const doc = await prisma.document.findFirst({
      where: {
        id: data.id,
        userId,
      },
    })

    if (!doc) {
      throw new Error('Document not found')
    }

    return doc
  }
)
