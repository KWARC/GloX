import { createServerFn } from '@tanstack/react-start'
import { uploadDocument } from '../api/documents/document.service'

export const uploadPdf = createServerFn({ method: 'POST' })
  .handler(async (file: File) => {
    return uploadDocument({ file })
  })
