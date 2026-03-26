import prisma from "@/lib/prisma";
import { FtmlStatement, RootNode, normalizeToRoot } from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

export const getCombinedDefinitionFtml = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      definitionIds: string[];
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
        id: { in: data.definitionIds },
      },
      select: {
        id: true,
        statement: true,
      },
    });

    if (!defs.length) {
      throw new Error("No definitions found");
    }

    const defMap = new Map(
      defs.map((d) => [d.id, d.statement as FtmlStatement | null]),
    );

    const combined: RootNode = {
      type: "root",
      content: [],
    };

    for (const id of data.definitionIds) {
      const statement = defMap.get(id);
      if (!statement) continue;

      const root = normalizeToRoot(statement);
      combined.content.push(...root.content);
    }

    return combined;
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
