import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  countSymbolReferences,
  getDeclaredSymbolUris,
  removeSymbolReferences,
} from "@/server/floDownBlockDeletion";
import { ExtractedItem } from "@/server/text-selection";
import {
  DefiniendumNode,
  FtmlContent,
  FtmlStatement,
  assertFtmlStatement,
  isDefiniendumNode,
  normalizeToRoot,
} from "@/types/ftml.types";
import { ExtractBlockType, buildStatementFromText } from "@/types/blockType";
import { createServerFn } from "@tanstack/react-start";
import { FileIdentity } from "./latex.server";

function extractDeclaredSymbols(statement: FtmlStatement) {
  const symbols = new Map<string, string | null>();
  const root = normalizeToRoot(statement);
  const stack: FtmlContent[] = [...root.content];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node === "string") continue;

    if (isDefiniendumNode(node) && node.symdecl === true) {
      const symbolName = node.uri.trim();
      if (symbolName) {
        const alias = extractDefiniendumAlias(node, symbolName);
        const existing = symbols.get(symbolName);
        symbols.set(symbolName, existing ?? alias);
      }
    }

    if (node.content?.length) {
      stack.push(...node.content);
    }
  }

  return Array.from(symbols.entries()).map(([symbolName, alias]) => ({
    symbolName,
    alias,
  }));
}

function extractDefiniendumAlias(
  node: DefiniendumNode,
  symbolName: string,
): string | null {
  const alias = (node.content ?? [])
    .filter((item): item is string => typeof item === "string")
    .join("")
    .trim();

  if (!alias || alias === symbolName) return null;
  return alias;
}

export type CreateFloDownBlockInput = {
  documentId: string;
  documentPageId?: string | null;
  pageNumber?: number | null;
  blockType?: ExtractBlockType;
  originalText: string;
  statement?: FtmlStatement;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export type FloDownBlockIdentityInput = Pick<
  CreateFloDownBlockInput,
  "futureRepo" | "filePath" | "fileName" | "language"
>;

export const findFloDownBlocksByIdentity = createServerFn({ method: "POST" })
  .inputValidator((data: FloDownBlockIdentityInput) => data)
  .handler(async ({ data }) => {
    const floDownBlocks = await prisma.floDownBlock.findMany({
      where: {
        futureRepo: data.futureRepo.trim(),
        filePath: data.filePath.trim(),
        fileName: data.fileName.trim(),
        language: data.language.trim(),
      },
      select: {
        id: true,
        originalText: true,
        statement: true,
        pageNumber: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return floDownBlocks.map((floDownBlock) => ({
      ...floDownBlock,
      statement: assertFtmlStatement(floDownBlock.statement),
    }));
  });

export const getFloDownBlockDeletionImpact = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const target = await prisma.floDownBlock.findUniqueOrThrow({
      where: { id: data.id },
    });
    const declared = getDeclaredSymbolUris(
      assertFtmlStatement(target.statement),
    );
    if (!declared.size) return [];

    const candidates = await prisma.floDownBlock.findMany({
      where: { id: { not: data.id } },
      select: {
        id: true,
        statement: true,
        pageNumber: true,
        originalText: true,
      },
    });
    return candidates.filter(
      (floDownBlock) =>
        countSymbolReferences(
          assertFtmlStatement(floDownBlock.statement),
          declared,
        ) > 0,
    );
  });

export const createFloDownBlock = createServerFn({ method: "POST" })
  .inputValidator((data: CreateFloDownBlockInput) => data)
  .handler(async ({ data }) => {
    const hasPageNumber =
      typeof data.pageNumber === "number" || data.pageNumber === null;

    if (
      !data.documentId ||
      !hasPageNumber ||
      !data.originalText?.trim() ||
      !data.futureRepo?.trim() ||
      !data.filePath?.trim() ||
      !data.fileName?.trim() ||
      !data.language?.trim()
    ) {
      throw new Error("Missing definition fields");
    }

    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const userId = userRes.user.id;
    const documentPageId =
      data.documentPageId ??
      (
        await prisma.documentPage.findFirst({
          where: { documentId: data.documentId },
          orderBy: { pageNumber: "asc" },
          select: { id: true },
        })
      )?.id;

    if (!documentPageId) {
      throw new Error("Document has no pages");
    }

    const statement: FtmlStatement =
      data.statement ??
      buildStatementFromText(
        data.blockType ?? "definition",
        data.originalText,
      );

    await prisma.$transaction(async (tx) => {
      const declaredSymbols = extractDeclaredSymbols(statement);

      const def = await tx.floDownBlock.create({
        data: {
          documentId: data.documentId,
          documentPageId,
          pageNumber: data.pageNumber,
          originalText: data.originalText.trim(),
          statement: JSON.parse(JSON.stringify(statement)),
          futureRepo: data.futureRepo,
          filePath: data.filePath,
          fileName: data.fileName,
          language: data.language,
          createdById: userId,
          updatedById: userId,
          currentVersion: 1,
          status: "EXTRACTED",
        },
      });

      for (const declaredSymbol of declaredSymbols) {
        await tx.symbol.upsert({
          where: {
            symbolName_futureRepo_filePath_fileName_language: {
              symbolName: declaredSymbol.symbolName,
              futureRepo: data.futureRepo,
              filePath: data.filePath,
              fileName: data.fileName,
              language: data.language,
            },
          },
          update: declaredSymbol.alias ? { alias: declaredSymbol.alias } : {},
          create: {
            symbolName: declaredSymbol.symbolName,
            alias: declaredSymbol.alias,
            futureRepo: data.futureRepo,
            filePath: data.filePath,
            fileName: data.fileName,
            language: data.language,
          },
        });
      }

      await tx.floDownBlockVersion.create({
        data: {
          floDownBlockId: def.id,
          versionNumber: 1,
          originalText: data.originalText.trim(),
          statement: JSON.parse(JSON.stringify(statement)),
          editedById: userId,
        },
      });
    });

    await prisma.document.update({
      where: { id: data.documentId },
      data: { status: "TEXT_EXTRACTED" },
    });

    return { success: true };
  });

export const updateFloDownBlock = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; statement: FtmlStatement }) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const userId = userRes.user.id;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.floDownBlock.findUniqueOrThrow({
        where: { id: data.id },
      });

      const nextVersion = existing.currentVersion + 1;

      await tx.floDownBlockVersion.create({
        data: {
          floDownBlockId: existing.id,
          versionNumber: nextVersion,
          originalText: existing.originalText,
          statement: JSON.parse(JSON.stringify(data.statement)),
          editedById: userId,
        },
      });

      await tx.floDownBlock.update({
        where: { id: data.id },
        data: {
          statement: JSON.parse(JSON.stringify(data.statement)),
          updatedById: userId,
          currentVersion: nextVersion,
        },
      });
    });

    return { success: true };
  });

export const deleteFloDownBlock = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const userId = userRes.user.id;

    return prisma.$transaction(async (tx) => {
      const target = await tx.floDownBlock.findUniqueOrThrow({
        where: { id: data.id },
      });
      const declared = getDeclaredSymbolUris(
        assertFtmlStatement(target.statement),
      );

      let affectedDefinitionCount = 0;
      let removedReferenceCount = 0;

      if (declared.size > 0) {
        const candidates = await tx.floDownBlock.findMany({
          where: { id: { not: data.id } },
          select: {
            id: true,
            originalText: true,
            statement: true,
            currentVersion: true,
          },
        });

        for (const floDownBlock of candidates) {
          const cleanup = removeSymbolReferences(
            assertFtmlStatement(floDownBlock.statement),
            declared,
          );
          if (cleanup.removedCount === 0) continue;

          const nextVersion = floDownBlock.currentVersion + 1;
          const serialized = JSON.parse(JSON.stringify(cleanup.statement));

          await tx.floDownBlockVersion.create({
            data: {
              floDownBlockId: floDownBlock.id,
              versionNumber: nextVersion,
              originalText: floDownBlock.originalText,
              statement: serialized,
              editedById: userId,
            },
          });

          await tx.floDownBlock.update({
            where: { id: floDownBlock.id },
            data: {
              statement: serialized,
              updatedById: userId,
              currentVersion: nextVersion,
            },
          });

          affectedDefinitionCount += 1;
          removedReferenceCount += cleanup.removedCount;
        }
      }

      await tx.floDownBlock.delete({
        where: { id: data.id },
      });

      return {
        success: true,
        affectedDefinitionCount,
        removedReferenceCount,
      };
    });
  });

export const updateFloDownBlockFilePath = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      futureRepo: string;
      filePath: string;
      fileName: string;
      language: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    return prisma.$transaction(async (tx) => {
      const current = await tx.floDownBlock.findUniqueOrThrow({
        where: { id: data.id },
      });

      const targetDefs = await tx.floDownBlock.findMany({
        where: {
          futureRepo: data.futureRepo,
          filePath: data.filePath,
          fileName: data.fileName,
          language: data.language,
        },
        select: { status: true },
      });

      if (targetDefs.length > 0) {
        const sameStatus = targetDefs.every((d) => d.status === current.status);

        if (!sameStatus) {
          throw new Error(
            "Cannot move definition: target path contains different status definitions",
          );
        }
      }

      const floDownBlock = await tx.floDownBlock.update({
        where: { id: data.id },
        data: {
          futureRepo: data.futureRepo,
          filePath: data.filePath,
          fileName: data.fileName,
          language: data.language,
        },
      });

      const statement = assertFtmlStatement(floDownBlock.statement);

      const symbols: string[] = [];

      const nodes = Array.isArray(statement)
        ? statement
        : statement.type === "root"
          ? (statement.content ?? [])
          : [statement];

      for (const node of nodes as any[]) {
        if (node.type !== "definition") continue;

        for (const child of node.content ?? []) {
          if (child.type === "definiendum" && child.symdecl === true) {
            const label = (child.content ?? [])
              .filter((c: any) => typeof c === "string")
              .join("");
            symbols.push(label);
          }

          if (child.type === "paragraph") {
            for (const sub of child.content ?? []) {
              if (sub.type === "definiendum" && sub.symdecl === true) {
                const label = (sub.content ?? [])
                  .filter((c: any) => typeof c === "string")
                  .join("");
                symbols.push(label);
              }
            }
          }
        }
      }

      for (const symbolName of symbols) {
        await tx.symbol.updateMany({
          where: { symbolName },
          data: {
            futureRepo: data.futureRepo,
            filePath: data.filePath,
            fileName: data.fileName,
            language: data.language,
          },
        });
      }

      return { success: true };
    });
  });

export const updateFloDownBlocksFilePath = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      identity: FileIdentity;
      futureRepo: string;
      filePath: string;
      fileName: string;
      language: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { identity, futureRepo, filePath, fileName, language } = data;

    return prisma.$transaction(async (tx) => {
      const defs = await tx.floDownBlock.findMany({
        where: {
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,
        },
        select: { id: true, status: true, statement: true },
      });

      if (defs.length === 0) return { success: true };

      const currentStatus = defs[0].status;

      const sameSourceStatus = defs.every((d) => d.status === currentStatus);
      if (!sameSourceStatus) {
        throw new Error("Source definitions have mixed status");
      }

      const targetDefs = await tx.floDownBlock.findMany({
        where: {
          futureRepo,
          filePath,
          fileName,
          language,
        },
        select: { status: true },
      });

      if (targetDefs.length > 0) {
        const sameTargetStatus = targetDefs.every(
          (d) => d.status === currentStatus,
        );

        if (!sameTargetStatus) {
          throw new Error(
            "Cannot move floDownBlocks: target path contains different status definitions",
          );
        }
      }

      const symbols: string[] = [];

      for (const def of defs) {
        const statement = assertFtmlStatement(def.statement);

        const nodes = Array.isArray(statement)
          ? statement
          : statement.type === "root"
            ? (statement.content ?? [])
            : [statement];

        for (const node of nodes as any[]) {
          if (node.type !== "definition") continue;

          for (const child of node.content ?? []) {
            if (child.type === "definiendum" && child.symdecl === true) {
              const label = (child.content ?? [])
                .filter((c: any) => typeof c === "string")
                .join("");
              symbols.push(label);
            }
          }
        }
      }

      await tx.floDownBlock.updateMany({
        where: {
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,
        },
        data: {
          futureRepo,
          filePath,
          fileName,
          language,
        },
      });

      for (const symbolName of [...new Set(symbols)]) {
        await tx.symbol.updateMany({
          where: { symbolName },
          data: {
            futureRepo,
            filePath,
            fileName,
            language,
          },
        });
      }

      return { success: true };
    });
  });

export const listFloDownBlocks = createServerFn({ method: "GET" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const defs = await prisma.floDownBlock.findMany({
      where: { documentId: data.documentId },
      orderBy: { createdAt: "asc" },
      include: {
        llmSuggestedDefiniendas: true,
      },
    });

    const items: ExtractedItem[] = defs.map((def) => {
      if (!def.statement) {
        throw new Error("Content has no FTML statement");
      }

      const statement = assertFtmlStatement(def.statement) as FtmlStatement;

      return {
        id: def.id,
        documentId: def.documentId,
        documentPageId: def.documentPageId,
        pageNumber: def.pageNumber,
        originalText: def.originalText,
        statement,
        futureRepo: def.futureRepo,
        filePath: def.filePath,
        fileName: def.fileName,
        language: def.language,
        status: def.status,

        definienda:
          def.llmSuggestedDefiniendas?.map((d) => ({
            text: d.definienda,
            label: "definiendum",
          })) || [],
      };
    });

    return items;
  });
