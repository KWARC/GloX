import prisma from "@/lib/prisma";
import { FtmlStatement, RootNode, normalizeToRoot } from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

export type CombinedFloDownBlockFtml = {
  ftml: RootNode;
  declaredSymbolsPerBlock: string[][];
};

export const getCombinedFloDownBlockFtml = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      floDownBlockIds: string[];
      documentId: string;
      futureRepo: string;
      filePath: string;
      fileName: string;
      language: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<CombinedFloDownBlockFtml> => {
    const defs = await prisma.floDownBlock.findMany({
      where: {
        id: { in: data.floDownBlockIds },
      },
      select: {
        id: true,
        statement: true,
        declaredSymbols: true,
      },
    });

    if (!defs.length) {
      throw new Error("No definitions found");
    }

    const defMap = new Map(
      defs.map((row) => [
        row.id,
        {
          statement: row.statement as FtmlStatement | null,
          declaredSymbols: row.declaredSymbols,
        },
      ]),
    );

    const combined: RootNode = {
      type: "root",
      content: [],
    };
    const declaredSymbolsPerBlock: string[][] = [];

    for (const id of data.floDownBlockIds) {
      const row = defMap.get(id);
      if (!row?.statement) continue;

      const root = normalizeToRoot(row.statement);
      for (const block of root.content) {
        combined.content.push(block);
        declaredSymbolsPerBlock.push(row.declaredSymbols);
      }
    }

    return { ftml: combined, declaredSymbolsPerBlock };
  });

export const getFinalizedLatexById = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const record = await prisma.latexTable.findUnique({
      where: { id: data.id },
    });

    if (!record || !record.isFinal) {
      throw new Error("Finalized document not found");
    }

    return {
      latex: record.finalLatex,
      documentId: record.documentId,
      futureRepo: record.futureRepo,
      filePath: record.filePath,
      fileName: record.fileName,
      language: record.language,
    };
  });
