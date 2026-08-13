export type UploadDocumentInput = {
  file: File;
  userId: string;
  futureRepo: string;
  filePath: string;
  language: string;
};

export type UploadDocumentResult =
  | {
      status: "OK";
      documentId: string;
    }
  | {
      status: "DUPLICATE";
      documentId: string;
    };
