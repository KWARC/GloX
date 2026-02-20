import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

export type DefinitionProvenance = {
  definitionId: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  createdAt: Date;
  updatedAt: Date;
};

export const getDefinitionProvenance = createServerFn({ method: "GET" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const definitions = await prisma.definition.findMany({
      where: { documentId: data.documentId },
      include: {
        document: {
          select: {
            id: true,
            filename: true,
          },
        },
      },
      orderBy: { pageNumber: "asc" },
    });

    return definitions.map((def): DefinitionProvenance => ({
      definitionId: def.id,
      documentId: def.documentId,
      documentName: def.document.filename,
      pageNumber: def.pageNumber,
      createdAt: def.createdAt,
      updatedAt: def.updatedAt,
    }));
  });
