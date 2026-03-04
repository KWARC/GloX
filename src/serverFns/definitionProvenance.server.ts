import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

type DefinitionProvenanceInput = {
  documentId: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const getDefinitionProvenance = createServerFn({ method: "POST" })
  .inputValidator((data: DefinitionProvenanceInput) => data)
  .handler(async ({ data }) => {
    const definitions = await prisma.definition.findMany({
      where: {
        documentId: data.documentId,
        futureRepo: data.futureRepo,
        filePath: data.filePath,
        fileName: data.fileName,
        language: data.language,
      },
      include: {
        document: {
          select: {
            filename: true,
          },
        },
      },
      orderBy: { pageNumber: "asc" },
    });

    return definitions.map((def) => ({
      definitionId: def.id,
      documentId: def.documentId,
      documentName: def.document.filename,
      pageNumber: def.pageNumber,
      createdAt: def.createdAt,
      updatedAt: def.updatedAt,
    }));
  });
