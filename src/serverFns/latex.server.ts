import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

export type LatexDraft = {
  latex: string;
  savedAt: string;
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

type LatexKey = {
  documentId: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const saveLatexDraft = createServerFn<
  any,
  "POST",
  LatexKey & { latex: string },
  void
>({ method: "POST" }).handler(async (ctx) => {
  if (!ctx.data) throw new Error("Missing data");

  const { latex, documentId, futureRepo, filePath, fileName, language } =
    ctx.data;

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

export const saveLatexFinal = createServerFn<
  any,
  "POST",
  LatexKey & { latex: string },
  void
>({ method: "POST" }).handler(async (ctx) => {
  if (!ctx.data) throw new Error("Missing data");

  const { latex, documentId, futureRepo, filePath, fileName, language } =
    ctx.data;

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

export const getLatexHistory = createServerFn<
  any,
  "GET",
  LatexKey,
  { history: LatexDraft[]; finalLatex: string; isFinal: boolean }
>({ method: "GET" }).handler(async (ctx) => {
  if (!ctx.data) throw new Error("Missing data");

  const record = await prisma.latexTable.findFirst({
    where: ctx.data,
    orderBy: { createdAt: "desc" },
  });

  return {
    history: normalizeHistory(record?.history),
    finalLatex: record?.finalLatex ?? "",
    isFinal: record?.isFinal ?? false,
  };
});

export const getFinalizedDocuments = createServerFn<
  any,
  "GET",
  void,
  FinalizedLatexDocument[]
>({ method: "GET" }).handler(async () => {
  const finalizedDocs = await prisma.latexTable.findMany({
    where: { isFinal: true },
    orderBy: { updatedAt: "desc" },
  });

  return finalizedDocs;
});