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

export const searchDefiniendum = createServerFn({ method: "POST" })
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => {
    console.log({query})
    return prisma.definiendum.findMany({
      where: {
        symbolName: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 10,
    });
  });
