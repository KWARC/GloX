import { createServerFn } from '@tanstack/react-start'
import { uploadDocument } from '../api/documents/document.service'
import type { UploadDocumentInput } from '../api/documents/document.types'

export const uploadPdf = createServerFn({ method: 'POST' })
  .handler(async (ctx) => {
    const { file } = ctx.data as UploadDocumentInput
    return uploadDocument({ file })
  })
