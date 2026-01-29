export interface UploadDocumentInput {
  file: File;
  userId: string;
}

export type UploadDocumentResult =
  | {
      status: "OK";
      documentId: string;
    }
  | {
      status: "DUPLICATE";
      documentId: string;
    };


