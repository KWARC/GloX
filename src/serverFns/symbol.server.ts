import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  findAllTextOccurrences,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import { findDefiniendum } from "@/server/parseUri";
import { addDeclaredSymbol } from "@/server/floDownBlockDeclaredSymbols";
import { sanitizeStatementForPersist } from "@/server/ftml/declaredSymbols";
// Remaining issue: sanitize only; no prepareFloDownBlockForPersist (declaredSymbols sync).
import { resolveDeclaredSymbolNames } from "@/server/floDownBlockDeletion";
import {
  assertFloDownStatement,
  DefiniendumNode,
  FloDownStatement,
  isDefinitionNode,
  normalizeToRoot,
  RootNode,
  unwrapRoot,
} from "@/types/floDown.types";
import { createServerFn } from "@tanstack/react-start";

type AuthorizedRole = "ADMIN" | "CURATOR";

async function requireAdminOrCurator(): Promise<{
  id: string;
  role: AuthorizedRole;
}> {
  const userRes = await currentUser();
  if (!userRes.loggedIn) throw new Error("Unauthorized");

  const role = userRes.user.role;
  if (role !== "ADMIN" && role !== "CURATOR") {
    throw new Error("Forbidden");
  }

  return {
    id: userRes.user.id,
    role,
  };
}

export type CreateSymbolDefiniendumInput = {
  floDownBlockId: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  symdecl: boolean;

  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;

  symbolName: string;
  alias?: string | null;

  selectedSymbolSource?: "DB" | "MATHHUB";
  selectedSymbolId?: string;
  selectedSymbolUri?: string;
};

export type SymbolAssociationSummary = {
  id: string;
  symbolName: string;
  alias: string | null;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
  associatedFloDownBlocks: Array<{
    id: string;
    documentId: string | null;
    statement: FloDownStatement;
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
    pageNumber: number | null;
  }>;
  associatedDefinitionCount: number;
  canDelete: boolean;
};

type AssociatedDefinitionSummary =
  SymbolAssociationSummary["associatedFloDownBlocks"][number];

function floDownBlockMatchesDeclaredSymbol(
  floDownBlock: {
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
    statement: unknown;
    declaredSymbols?: string[];
  },
  symbol: {
    symbolName: string;
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  },
): boolean {
  if (
    floDownBlock.futureRepo !== symbol.futureRepo ||
    floDownBlock.filePath !== symbol.filePath ||
    floDownBlock.fileName !== symbol.fileName ||
    floDownBlock.language !== symbol.language
  ) {
    return false;
  }

  const declared = resolveDeclaredSymbolNames(
    assertFloDownStatement(floDownBlock.statement),
    floDownBlock.declaredSymbols,
  );

  return declared.includes(symbol.symbolName);
}

function addAssociatedFloDownBlock(
  floDownBlockMap: Map<string, AssociatedDefinitionSummary>,
  floDownBlock: AssociatedDefinitionSummary,
) {
  floDownBlockMap.set(floDownBlock.id, floDownBlock);
}

async function buildSymbolAssociations() {
  const [symbols, floDownBlocks] = await Promise.all([
    prisma.symbol.findMany({
      orderBy: [
        { symbolName: "asc" },
        { futureRepo: "asc" },
        { filePath: "asc" },
        { fileName: "asc" },
        { language: "asc" },
      ],
    }),
    prisma.floDownBlock.findMany({
      where: { status: { not: "DISCARDED" } },
      select: {
        id: true,
        documentId: true,
        statement: true,
        declaredSymbols: true,
        pageNumber: true,
        futureRepo: true,
        filePath: true,
        fileName: true,
        language: true,
      },
    }),
  ]);

  return symbols.map((symbol) => {
    const floDownBlockMap = new Map<string, AssociatedDefinitionSummary>();

    for (const floDownBlock of floDownBlocks) {
      if (!floDownBlockMatchesDeclaredSymbol(floDownBlock, symbol)) continue;

      addAssociatedFloDownBlock(floDownBlockMap, {
        id: floDownBlock.id,
        documentId: floDownBlock.documentId,
        statement: assertFloDownStatement(floDownBlock.statement),
        futureRepo: floDownBlock.futureRepo,
        filePath: floDownBlock.filePath,
        fileName: floDownBlock.fileName,
        language: floDownBlock.language,
        pageNumber: floDownBlock.pageNumber,
      });
    }

    const associatedFloDownBlocks = Array.from(floDownBlockMap.values());

    return {
      id: symbol.id,
      symbolName: symbol.symbolName,
      alias: symbol.alias,
      futureRepo: symbol.futureRepo,
      filePath: symbol.filePath,
      fileName: symbol.fileName,
      language: symbol.language,
      createdAt: symbol.createdAt,
      updatedAt: symbol.updatedAt,
      associatedFloDownBlocks,
      associatedDefinitionCount: associatedFloDownBlocks.length,
      canDelete: associatedFloDownBlocks.length === 0,
    } satisfies SymbolAssociationSummary;
  });
}

export const getAllSymbols = createServerFn({ method: "GET" }).handler(
  async () => {
    return prisma.symbol.findMany({
      include: {
        confirmedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },
);

export const listSymbolsWithAssociations = createServerFn({
  method: "GET",
}).handler(async () => {
  await requireAdminOrCurator();

  return buildSymbolAssociations();
});

export const deleteSymbolIfUnassociated = createServerFn({ method: "POST" })
  .inputValidator((data: { symbolId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminOrCurator();

    const associations = await buildSymbolAssociations();
    const symbol = associations.find((item) => item.id === data.symbolId);

    if (!symbol) {
      throw new Error("Symbol not found");
    }

    if (symbol.associatedDefinitionCount > 0) {
      throw new Error("Cannot delete symbol with associated definitions");
    }

    await prisma.symbol.delete({
      where: { id: data.symbolId },
    });

    return { success: true };
  });

export const createSymbolDefiniendum = createServerFn({ method: "POST" })
  .inputValidator((data: CreateSymbolDefiniendumInput) => data)
  .handler(async ({ data }) => {
    return prisma.$transaction(async (tx) => {
      const {
        floDownBlockId,
        selectedText,
        symdecl,
        futureRepo,
        filePath,
        fileName,
        language,
        symbolName,
        alias,
        selectedSymbolSource,
        selectedSymbolId,
        selectedSymbolUri,
      } = data;

      const userRes = await currentUser();
      if (!userRes.loggedIn) throw new Error("Unauthorized");

      const userId = userRes.user.id;

      if (!floDownBlockId || !selectedText.trim()) {
        throw new Error("Invalid input");
      }

      const floDownBlock = await tx.floDownBlock.findUnique({
        where: { id: floDownBlockId },
      });

      if (!floDownBlock?.statement) {
        throw new Error("Content not found");
      }

      let uri: string;
      let linkedExistingSymbol = false;
      if (symdecl) {
        if (!symbolName.trim()) {
          throw new Error("Symbol name required");
        }

        const existingSymbol = await tx.symbol.findUnique({
          where: {
            symbolName_futureRepo_filePath_fileName_language: {
              symbolName: symbolName.trim(), futureRepo: futureRepo.trim(),
              filePath: filePath.trim(), fileName: fileName.trim(), language: language.trim(),
            },
          },
        });

        if (existingSymbol) linkedExistingSymbol = true;
        else await tx.symbol.create({
          data: {
            symbolName: symbolName.trim(), alias: alias?.trim() || null,
            futureRepo: futureRepo.trim(), filePath: filePath.trim(),
            fileName: fileName.trim(), language: language.trim(),
          },
        });

        uri = symbolName.trim();
      } else {
        if (!selectedSymbolSource) {
          throw new Error("Symbol source required");
        }

        if (selectedSymbolSource === "DB") {
          if (!selectedSymbolId) {
            throw new Error("selectedSymbolId required");
          }

          const existing = await tx.symbol.findUnique({
            where: { id: selectedSymbolId },
          });

          if (!existing) {
            throw new Error("Symbol not found");
          }

          uri = existing.symbolName;
        } else {
          if (!selectedSymbolUri) {
            throw new Error("selectedSymbolUri required");
          }

          uri = selectedSymbolUri;
        }
      }

      const root: RootNode = normalizeToRoot(
        assertFloDownStatement(floDownBlock.statement),
      );

      const firstNode = root.content[0];

      if (!isDefinitionNode(firstNode)) {
        throw new Error("Expected definition node at root");
      }

      const definitionNode = firstNode;

      const firstContent = definitionNode.content?.[0];

      if (!firstContent || firstContent.type !== "paragraph") {
        throw new Error("Expected paragraph node inside definition");
      }

      const occurrences = findAllTextOccurrences(root, selectedText);

      const location = occurrences.find(
        (loc) => loc.offset === data.startOffset,
      );

      if (!location) {
        throw new Error("Exact selection match not found in AST");
      }

      const targetPath = [location.paragraphIndex, location.contentIndex];

      if (pathTraversesSemanticNode(root, targetPath)) {
        throw new Error(
          "Cannot insert definiendum inside existing semantic node",
        );
      }

      const definiendumNode: DefiniendumNode = {
        type: "definiendum",
        uri,
        content: [alias || selectedText],
        symdecl: linkedExistingSymbol ? false : symdecl,
      };

      const updatedRoot = replaceTextWithNode(
        root,
        location,
        data.startOffset,
        data.endOffset,
        definiendumNode,
      );

      const existing = await tx.floDownBlock.findUniqueOrThrow({
        where: { id: floDownBlockId },
      });

      const nextVersion = existing.currentVersion + 1;
      const newStatement = sanitizeStatementForPersist(unwrapRoot(updatedRoot));

      if (symdecl && !linkedExistingSymbol) {
        await addDeclaredSymbol(tx, floDownBlockId, uri, {
          futureRepo: existing.futureRepo,
          filePath: existing.filePath,
          fileName: existing.fileName,
          language: existing.language,
        });
      }

      await tx.floDownBlockVersion.create({
        data: {
          floDownBlockId: floDownBlockId,
          versionNumber: nextVersion,
          originalText: existing.originalText,
          statement: JSON.parse(JSON.stringify(newStatement)),
          editedById: userId,
        },
      });

      await tx.floDownBlock.update({
        where: { id: floDownBlockId },
        data: {
          statement: JSON.parse(JSON.stringify(newStatement)),
          updatedById: userId,
          currentVersion: nextVersion,
        },
      });
      return { ok: true, linkedExistingSymbol };
    });
  });

export const searchSymbol = createServerFn({ method: "POST" })
  .inputValidator((query: string) => query)
  .handler(async ({ data: query }) => {
    return prisma.symbol.findMany({
      where: {
        symbolName: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });
  });

export const getFloDownBlockBySymbol = createServerFn({ method: "POST" })
  .inputValidator((symbolName: string) => symbolName)
  .handler(async ({ data: symbolName }) => {
    const defs = await prisma.floDownBlock.findMany({
      select: {
        id: true,
        documentId: true,
        documentPageId: true,
        pageNumber: true,
        originalText: true,
        futureRepo: true,
        filePath: true,
        fileName: true,
        language: true,
        statement: true,
      },
    });

    for (const def of defs) {
      const root = normalizeToRoot(assertFloDownStatement(def.statement));

      for (const node of root.content) {
        if (!isDefinitionNode(node)) continue;

        for (const inner of node.content) {
          if (inner.type !== "paragraph") continue;
          if (findDefiniendum(inner.content, symbolName)) {
            return def;
          }
        }
      }
    }

    return null;
  });
