export type UploadDocumentInput = {
  file: File;
  userId: string;
  futureRepo: string;
  filePath: string;
  language: string;
  moduleDescription: boolean;
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
