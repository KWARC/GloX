import prisma from "@/lib/prisma";
import { documentFloDownBlockWhere } from "@/server/floDownBlockProvenance";
import { resolveDeclaredSymbolNames } from "@/server/floDownBlockDeletion";
import { ExtractedItem } from "@/server/text-selection";
import {
  assertFloDownStatement,
  FloDownStatement,
} from "@/types/floDown.types";
import { createServerFn } from "@tanstack/react-start";

export type LatexDraft = {
  latex: string;
  savedAt: string;
};

export type LatexFileIdentity = {
  documentId: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export type FinalizedLatexDocument = {
  id: string;
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

  return value.filter((e): e is LatexDraft => {
    if (typeof e !== "object" || e === null) return false;
    if (!("latex" in e) || !("savedAt" in e)) return false;

    const candidate = e as { latex: unknown; savedAt: unknown };
    return (
      typeof candidate.latex === "string" &&
      typeof candidate.savedAt === "string"
    );
  });
}

export const saveLatexDraft = createServerFn({ method: "POST" })
  .inputValidator((data: LatexFileIdentity & { latex: string }) => data)
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
          history: JSON.parse(JSON.stringify(nextHistory)),
        },
      });
    } else {
      await prisma.latexTable.update({
        where: { id: existing.id },
        data: {
          history: JSON.parse(JSON.stringify(nextHistory)),
          isFinal: false,
        },
      });
    }
  });

export const saveLatexFinal = createServerFn({ method: "POST" })
  .inputValidator((data: LatexFileIdentity & { latex: string }) => data)
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
          history: JSON.parse(JSON.stringify([] as LatexDraft[])),
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
  .inputValidator((data: LatexFileIdentity) => data)
  .handler(async ({ data }) => {
    const { documentId, futureRepo, filePath, fileName, language } = data;

    const record = await prisma.latexTable.findFirst({
      where: { documentId, futureRepo, filePath, fileName, language },
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
  },
);

export const getFileIdentities = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      status?:
        | "EXTRACTED"
        | "FINALIZED_IN_FILE"
        | "SUBMITTED_TO_MATHHUB"
        | "DISCARDED";
    }) => data,
  )
  .handler(async ({ data }) => {
    const floDownBlocks = await prisma.floDownBlock.findMany({
      where: data.status
        ? { ...documentFloDownBlockWhere, status: data.status }
        : documentFloDownBlockWhere,
      distinct: ["futureRepo", "filePath", "fileName", "language"],
      select: {
        documentId: true,
        futureRepo: true,
        filePath: true,
        fileName: true,
        language: true,
      },
      orderBy: [
        { futureRepo: "asc" },
        { filePath: "asc" },
        { fileName: "asc" },
        { language: "asc" },
      ],
    });

    return floDownBlocks.filter(
      (row): row is typeof row & { documentId: string } =>
        row.documentId != null,
    );
  });

export type FileIdentity = {
  documentId: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const getFloDownBlocksByIdentity = createServerFn({ method: "POST" })
  .inputValidator((data: FileIdentity) => data)
  .handler(async ({ data }) => {
    const defs = await prisma.floDownBlock.findMany({
      where: {
        ...documentFloDownBlockWhere,
        documentId: data.documentId,
        futureRepo: data.futureRepo,
        filePath: data.filePath,
        fileName: data.fileName,
        language: data.language,
      },
      include: {
        llmSuggestedDefiniendas: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        updatedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const typedDefinitions: ExtractedItem[] = defs.map((def) => {
      const statement = assertFloDownStatement(def.statement) as FloDownStatement;

      return {
        id: def.id,
        documentId: def.documentId!,
        documentPageId: def.documentPageId!,
        pageNumber: def.pageNumber,
        originalText: def.originalText,
        statement,
        declaredSymbols: def.declaredSymbols,
        futureRepo: def.futureRepo,
        filePath: def.filePath,
        fileName: def.fileName,
        language: def.language,
        createdBy: def.createdBy,
        updatedBy: def.updatedBy,
        definienda:
          def.llmSuggestedDefiniendas?.map((d) => ({
            text: d.definienda,
            label: "definiendum",
          })) || [],
      };
    });

    const symbols: { id: string; label: string }[] = [];

    for (const def of typedDefinitions) {
      for (const label of resolveDeclaredSymbolNames(
        def.statement,
        def.declaredSymbols,
      )) {
        symbols.push({ id: def.id, label });
      }
    }

    return {
      symbols,
      floDownBlocks: typedDefinitions,
    };
  });
