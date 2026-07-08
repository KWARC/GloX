import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

type ModuleDescriptionVisibility = "all" | "only" | "exclude";

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
        source: "NEW";
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

type ListIndexDocumentsInput = {
  moduleDescriptionVisibility?: ModuleDescriptionVisibility;
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
      selectedSymbol.source === "DB" || selectedSymbol.source === "NEW"
        ? selectedSymbol.symbolName
        : selectedSymbol.uri;

    return prisma.$transaction(async (tx) => {
      const reference = await tx.markReference.create({
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

      await tx.document.updateMany({
        where: {
          id: data.documentId,
          indexStatus: null,
        },
        data: {
          indexStatus: "EXTRACTED",
        },
      });

      return reference;
    });
  });

export const deleteMarkReference = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const id = data.id?.trim();
    if (!id) throw new Error("Mark reference id is required");

    await prisma.$transaction(async (tx) => {
      const reference = await tx.markReference.delete({
        where: { id },
        select: { documentId: true },
      });

      const remainingReferences = await tx.markReference.count({
        where: { documentId: reference.documentId },
      });

      if (remainingReferences === 0) {
        await tx.document.update({
          where: { id: reference.documentId },
          data: { indexStatus: null },
        });
      }
    });

    return { success: true as const };
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
  .inputValidator((data: ListIndexDocumentsInput) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const moduleDescriptionVisibility =
      data.moduleDescriptionVisibility ?? "all";

    const documents = await prisma.document.findMany({
      where: {
        indexStatus: { not: null },
        ...(moduleDescriptionVisibility === "only"
          ? { moduleDescription: true }
          : moduleDescriptionVisibility === "exclude"
            ? { moduleDescription: false }
            : {}),
      },
      select: {
        id: true,
        filename: true,
        futureRepo: true,
        filePath: true,
        language: true,
        moduleDescription: true,
        indexStatus: true,
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
      orderBy: [{ filename: "asc" }],
    });

    return documents;
  });
