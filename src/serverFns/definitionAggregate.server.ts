import prisma from "@/lib/prisma";
import { FtmlStatement, RootNode, normalizeToRoot } from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

export const getCombinedDefinitionFtml = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      documentId: string;
      futureRepo: string;
      filePath: string;
      fileName: string;
      language: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const defs = (await prisma.definition.findMany({
      where: {
        documentId: data.documentId,
        futureRepo: data.futureRepo,
        filePath: data.filePath,
        fileName: data.fileName,
        language: data.language,
      },
      orderBy: { pageNumber: "asc" },
      select: { statement: true },
    })) as { statement: FtmlStatement | null }[];

    const combined: RootNode = {
      type: "root",
      content: [],
    };

    for (const row of defs) {
      if (!row.statement) continue;

      const root = normalizeToRoot(row.statement);
      combined.content.push(...root.content);
    }

    return combined;
  });
