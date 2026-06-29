import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

type CreateLocalSymbolInput = {
  symbolName: string;
  alias?: string | null;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

type CreateMarkReferenceInput = {
  documentId: string;
  documentPageId: string;
  pageNumber: number;
  verbalization: string;
  selectedSymbol:
    | {
        source: "DB";
        id: string;
        symbolName: string;
      }
    | {
        source: "MATHHUB";
        uri: string;
      };
};

export type CreatedLocalSymbol = {
  id: string;
  symbolName: string;
  alias: string | null;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const createLocalSymbol = createServerFn({ method: "POST" })
  .inputValidator((data: CreateLocalSymbolInput) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const symbolName = data.symbolName?.trim();
    const futureRepo = data.futureRepo?.trim();
    const filePath = data.filePath?.trim();
    const fileName = data.fileName?.trim();
    const language = data.language?.trim();

    if (!symbolName || !futureRepo || !filePath || !fileName || !language) {
      throw new Error("Missing symbol creation fields");
    }

    const symbol = await prisma.symbol.upsert({
      where: {
        symbolName_futureRepo_filePath_fileName_language: {
          symbolName,
          futureRepo,
          filePath,
          fileName,
          language,
        },
      },
      update: {
        alias: data.alias?.trim() || null,
      },
      create: {
        symbolName,
        alias: data.alias?.trim() || null,
        futureRepo,
        filePath,
        fileName,
        language,
      },
      select: {
        id: true,
        symbolName: true,
        alias: true,
        futureRepo: true,
        filePath: true,
        fileName: true,
        language: true,
      },
    });

    return symbol satisfies CreatedLocalSymbol;
  });

export const createMarkReference = createServerFn({ method: "POST" })
  .inputValidator((data: CreateMarkReferenceInput) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const { selectedSymbol } = data;

    const symbolName =
      selectedSymbol.source === "DB"
        ? selectedSymbol.symbolName
        : selectedSymbol.uri;

    return prisma.markReference.create({
      data: {
        documentId: data.documentId,
        documentPageId: data.documentPageId,
        pageNumber: data.pageNumber,
        symbolName,
        verbalization: data.verbalization.trim(),
        createdById: userRes.user.id,
      },
      select: {
        id: true,
        documentPageId: true,
        pageNumber: true,
        symbolName: true,
        verbalization: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

export const listMarkReferences = createServerFn({ method: "POST" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    return prisma.markReference.findMany({
      where: { documentId: data.documentId },
      select: {
        id: true,
        documentId: true,
        documentPageId: true,
        pageNumber: true,
        symbolName: true,
        verbalization: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { pageNumber: "asc" },
        { createdAt: "asc" },
      ],
    });
  });

export const listMarkReferenceFiles = createServerFn({ method: "POST" })
  .inputValidator((data: { documentIds: string[] }) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");
    if (data.documentIds.length === 0) return [];

    const documents = await prisma.document.findMany({
      where: { id: { in: data.documentIds } },
      select: {
        id: true,
        filename: true,
        futureRepo: true,
        filePath: true,
        language: true,
        markReferences: {
          select: {
            id: true,
            documentPageId: true,
            pageNumber: true,
            symbolName: true,
            verbalization: true,
          },
          orderBy: [{ pageNumber: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: { filename: "asc" },
    });

    return documents;
  });
