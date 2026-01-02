import { uploadPdf } from '@/routes/upload.server'

export async function uploadPdfApi(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return uploadPdf({ data: formData } as any);
}