import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

type DefinitionProvenanceInput = {
  definitionIds: string[];
  documentId: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const getDefinitionProvenance = createServerFn({ method: "POST" })
  .inputValidator((data: DefinitionProvenanceInput) => data)
  .handler(async ({ data }) => {
    const defs = await prisma.definition.findMany({
      where: {
        id: { in: data.definitionIds },
      },
      include: {
        document: {
          select: { filename: true },
        },
      },
    });

    const ordered = data.definitionIds.map((id) =>
      defs.find((d) => d.id === id),
    );

    return ordered.filter(Boolean).map((def) => ({
      definitionId: def!.id,
      documentId: def!.documentId,
      documentName: def!.document.filename,
      pageNumber: def!.pageNumber,
      createdAt: def!.createdAt,
      updatedAt: def!.updatedAt,
    }));
  });
