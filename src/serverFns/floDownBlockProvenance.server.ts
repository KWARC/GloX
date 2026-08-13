import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

type FloDownBlockProvenanceInput = {
  floDownBlockIds: string[];
  documentId: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const getFloDownBlockProvenance = createServerFn({ method: "POST" })
  .inputValidator((data: FloDownBlockProvenanceInput) => data)
  .handler(async ({ data }) => {
    const defs = await prisma.floDownBlock.findMany({
      where: {
        id: { in: data.floDownBlockIds },
      },
      include: {
        document: {
          select: { filename: true },
        },
      },
    });

    const ordered = data.floDownBlockIds.map((id) =>
      defs.find((d) => d.id === id),
    );

    return ordered.filter(Boolean).map((def) => ({
      floDownBlockId: def!.id,
      documentId: def!.documentId,
      documentName: def!.document?.filename ?? "Module definition",
      pageNumber: def!.pageNumber,
      createdAt: def!.createdAt,
      updatedAt: def!.updatedAt,
    }));
  });
