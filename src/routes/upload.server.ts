import { createServerFn } from '@tanstack/react-start'
import { uploadDocument } from '../api/documents/document.service'
import type { UploadDocumentResult } from '../api/documents/document.types'

export const uploadPdf = createServerFn({ method: 'POST' }).handler(
  async (ctx): Promise<UploadDocumentResult> => {
    const request = (ctx as any).request as Request;
    const formData = await request.formData();
    const file = formData.get('file') as File;
        if (!file) {
      throw new Error('No file provided');
    }
    return uploadDocument({ file });
  }
);