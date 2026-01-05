import crypto from 'node:crypto'
import prisma from '../../lib/prisma'
import { UploadDocumentInput, UploadDocumentResult } from './document.types'

export async function uploadDocument(
  input: UploadDocumentInput
): Promise<UploadDocumentResult> {
  const { file , userId } = input

  if (!(file instanceof File)) {
    throw new Error('INVALID_FILE')
  }

  if (file.type !== 'application/pdf') {
    throw new Error('INVALID_MIME_TYPE')
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const fileHash = crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex')

  const existing = await prisma.document.findUnique({
    where: { fileHash },
  })

  if (existing) {
    return {
      status: 'DUPLICATE',
      documentId: existing.id,
    }
  }

  const document = await prisma.document.create({
    data: {
      filename: file.name,
      fileHash,
      mimeType: file.type,
      fileSize: buffer.length,
      userId,     
      status: 'UPLOADED',
    },
  })

  return {
    status: 'OK',
    documentId: document.id,
  }
}
