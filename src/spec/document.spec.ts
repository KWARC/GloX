import {
  uploadDocumentServer,
  extractDocumentTextServer,
  listDocumentsServer,
} from '../routes/document.server'

export async function uploadDocument(file: File) {
  return uploadDocumentServer({ file })
}

export async function extractDocumentText(documentId: string) {
  return extractDocumentTextServer({ documentId })
}

export async function listDocuments() {
  return listDocumentsServer()
}
