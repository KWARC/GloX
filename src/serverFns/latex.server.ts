import prisma from "@/lib/prisma";
import {
  assertFtmlStatement,
  FtmlNode,
  FtmlStatement,
  isDefiniendumNode,
  isDefinitionNode,
  isNode,
  isParagraphNode,
} from "@/types/ftml.types";
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
          history: JSON.parse(JSON.stringify(nextHistory)),
          isFinal: false,
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
  },
);

export const getFileIdentities = createServerFn({ method: "GET" }).handler(
  async () => {
    const definitions = await prisma.definition.findMany({
      distinct: ["futureRepo", "filePath", "fileName", "language"],
      select: {
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

    return definitions;
  },
);

export type FileIdentity = {
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const getDefinitionsByIdentity = createServerFn({ method: "POST" })
  .inputValidator((data: FileIdentity) => data)
  .handler(async ({ data }) => {
    const defs = await prisma.definition.findMany({
      where: {
        futureRepo: data.futureRepo,
        filePath: data.filePath,
        fileName: data.fileName,
        language: data.language,
      },
      orderBy: { createdAt: "asc" },
    });

    const typedDefinitions = defs.map((def) => {
      const statement = assertFtmlStatement(def.statement) as FtmlStatement;

      return {
        id: def.id,
        statement,
      };
    });

    const symbols: { id: string; label: string }[] = [];

    for (const def of typedDefinitions) {
      const statement = def.statement;

      const nodes: FtmlNode[] = Array.isArray(statement)
        ? statement.filter(isNode)
        : statement.type === "root"
          ? (statement.content ?? []).filter(isNode)
          : [statement];

      for (const node of nodes) {
        if (!isDefinitionNode(node)) continue;

        for (const child of node.content ?? []) {
          if (!isNode(child)) continue;

          if (isDefiniendumNode(child) && child.symdecl === true) {
            const label = (child.content ?? [])
              .filter((c): c is string => typeof c === "string")
              .join("");

            symbols.push({
              id: def.id,
              label,
            });

            continue;
          }

          if (isParagraphNode(child)) {
            for (const sub of child.content ?? []) {
              if (!isNode(sub)) continue;

              if (isDefiniendumNode(sub) && sub.symdecl === true) {
                const label = (sub.content ?? [])
                  .filter((c): c is string => typeof c === "string")
                  .join("");

                symbols.push({
                  id: def.id,
                  label,
                });
              }
            }
          }
        }
      }
    }

    return {
      symbols,
      definitions: typedDefinitions,
    };
  });
