export interface UploadDocumentInput {
  file: File
}

export type UploadDocumentResult =
  | {
      status: 'OK'
      documentId: string
    }
  | {
      status: 'DUPLICATE'
      documentId: string
    }

export enum DocumentStatus {
  UPLOADED = 'UPLOADED',
  TEXT_EXTRACTED = 'TEXT_EXTRACTED',
  FAILED = 'FAILED',
}
