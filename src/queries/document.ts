import { queryOptions } from "@tanstack/react-query";
import { getMyDocuments } from "@/serverFns/myDocuments.server";

export type MyDocument = {
  id: string;
  filename: string;
  fileHash: string;
  mimeType: string;
  fileSize: number;
  userId: string;
  status: string;
  extractedText: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const myDocumentsQuery = queryOptions<MyDocument[]>({
  queryKey: ["documents", "mine"],
  queryFn: async () => {
    const res = await getMyDocuments();

    if (!res.success) {
      throw new Error(res.error || "Not authenticated");
    }
    return res.documents;
  },
});
