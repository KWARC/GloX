import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

export type CreateDefiniendumInput = {
  symbolName: string;
  alias?: string | null;
  symbolDeclared?: boolean;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const createDefiniendum = createServerFn({ method: "POST" })
  .inputValidator((data: CreateDefiniendumInput) => data)
  .handler(async ({ data }) => {
    const {
      symbolName,
      alias,
      symbolDeclared = true,
      futureRepo,
      filePath,
      fileName,
      language,
    } = data;

    if (
      !symbolName.trim() ||
      !futureRepo.trim() ||
      !filePath.trim() ||
      !fileName.trim() ||
      !language.trim()
    ) {
      throw new Error("Missing definiendum fields");
    }

    return prisma.definiendum.create({
      data: {
        symbolName,
        alias,
        symbolDeclared,
        futureRepo,
        filePath,
        fileName,
        language,
      },
    });
  });

export const listDefinienda = createServerFn({ method: "GET" }).handler(
  async () => {
    return prisma.definiendum.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
);

export const listDefiniendaByDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const { documentId } = data;

    const extracts = await prisma.definition.findMany({
      where: { documentId },
      select: {
        futureRepo: true,
        filePath: true,
        fileName: true,
        language: true,
      },
    });

    if (extracts.length === 0) return [];

    const ors = extracts.map((e) => ({
      definitions: {
        some: {
          archive: e.futureRepo,
          filePath: e.filePath,
          fileName: e.fileName,
          language: e.language,
        },
      },
    }));

    return prisma.definiendum.findMany({
      where: { OR: ors },
      orderBy: { createdAt: "asc" },
    });
  });
