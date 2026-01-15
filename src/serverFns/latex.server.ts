import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

export type LatexDraft = {
  latex: string;
  savedAt: string;
};

export type LatexKey = {
  documentId: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export type FinalizedLatexDocument = {
  id: number;
  documentId: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  finalLatex: string;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeHistory(value: unknown): LatexDraft[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (e): e is LatexDraft =>
      typeof e === "object" &&
      e !== null &&
      "latex" in e &&
      "savedAt" in e &&
      typeof (e as any).latex === "string" &&
      typeof (e as any).savedAt === "string"
  );
}

export const saveLatexDraft = createServerFn({ method: "POST" })
  .inputValidator((data: LatexKey & { latex: string }) => data)
  .handler(async ({ data }) => {
    const { latex, documentId, futureRepo, filePath, fileName, language } =
      data;

    const existing = await prisma.latexTable.findFirst({
      where: { documentId, futureRepo, filePath, fileName, language },
    });

    const history = normalizeHistory(existing?.history);

    const nextHistory = [
      ...history,
      { latex, savedAt: new Date().toISOString() },
    ];

    if (!existing) {
      await prisma.latexTable.create({
        data: {
          documentId,
          futureRepo,
          filePath,
          fileName,
          language,
          finalLatex: "",
          history: nextHistory,
          isFinal: false,
        },
      });
    } else {
      await prisma.latexTable.update({
        where: { id: existing.id },
        data: {
          history: nextHistory,
          isFinal: false,
        },
      });
    }
  });

export const saveLatexFinal = createServerFn({ method: "POST" })
  .inputValidator((data: LatexKey & { latex: string }) => data)
  .handler(async ({ data }) => {
    const { latex, documentId, futureRepo, filePath, fileName, language } =
      data;

    const existing = await prisma.latexTable.findFirst({
      where: { documentId, futureRepo, filePath, fileName, language },
    });

    if (!existing) {
      await prisma.latexTable.create({
        data: {
          documentId,
          futureRepo,
          filePath,
          fileName,
          language,
          finalLatex: latex,
          history: [],
          isFinal: true,
        },
      });
    } else {
      await prisma.latexTable.update({
        where: { id: existing.id },
        data: {
          finalLatex: latex,
          isFinal: true,
        },
      });
    }
  });

export const getLatexHistory = createServerFn({ method: "GET" })
  .inputValidator((data: LatexKey) => data)
  .handler(async ({ data }) => {
    const record = await prisma.latexTable.findFirst({
      where: data,
      orderBy: { createdAt: "desc" },
    });

    return {
      history: normalizeHistory(record?.history),
      finalLatex: record?.finalLatex ?? "",
      isFinal: record?.isFinal ?? false,
    };
  });

export const getFinalizedDocuments = createServerFn({ method: "GET" }).handler(
  async () => {
    return prisma.latexTable.findMany({
      where: { isFinal: true },
      orderBy: { updatedAt: "desc" },
    });
  }
);
