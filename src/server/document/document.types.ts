export interface UploadDocumentInput {
  file: File
  userId: string
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

export type CreateExtractedTextInput = {
  documentId: string;
  documentPageId: string;
  pageNumber: number;

  originalText: string;
  statement: string;

  futureRepo: string;
  filePath: string;
};

