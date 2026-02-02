import prisma from "@/lib/prisma";
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
    const defs = await prisma.definition.findMany({
      where: {
        documentId: data.documentId,
        futureRepo: data.futureRepo,
        filePath: data.filePath,
        fileName: data.fileName,
        language: data.language,
      },
      orderBy: { pageNumber: "asc" },
      select: { statement: true },
    });

    const combined = {
      type: "root",
      content: defs.flatMap((d: any) => {
        const s = d.statement;
        if (!s) return [];
        if (s.type === "root") return s.content ?? [];
        return [s];
      }),
    };

    return combined;
  });
