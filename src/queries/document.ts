import { getMyDocuments } from "@/serverFns/myDocuments.server";
import { queryOptions } from "@tanstack/react-query";

export type MyDocument = {
  id: string
  filename: string
  fileHash: string
  mimeType: string
  fileSize: number

  futureRepo: string
  filePath: string
  language: string

  userId: string
  status: string

  createdAt: Date
  updatedAt: Date
}

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
