import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  findAllTextOccurrences,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import { findDefiniendum } from "@/server/parseUri";
import { parseDeclaredSymbolsInfo } from "@/server/declaredSymbolsInfo";
import { addDeclaredSymbol } from "@/server/floDownBlockDeclaredSymbols";
import { sanitizeStatementForPersist } from "@/server/ftml/declaredSymbols";
import {
  associatedBlocksForUri,
  catalogFromBlocks,
  loadLiveFloDownBlocks,
  searchCatalog,
} from "@/server/symbolCatalog";
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
  symbolUri?: string;
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

async function buildSymbolAssociations() {
  const floDownBlocks = await loadLiveFloDownBlocks();
  const catalog = catalogFromBlocks(floDownBlocks);

  return catalog.map((symbol) => {
    const associatedFloDownBlocks = associatedBlocksForUri(
      floDownBlocks,
      symbol.symbolUri,
    );

    return {
      id: symbol.id,
      symbolName: symbol.symbolName,
      alias: symbol.alias,
      futureRepo: symbol.futureRepo,
      filePath: symbol.filePath,
      fileName: symbol.fileName,
      language: symbol.language,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      associatedFloDownBlocks,
      associatedDefinitionCount: associatedFloDownBlocks.length,
      canDelete: associatedFloDownBlocks.length === 0,
    } satisfies SymbolAssociationSummary;
  });
}

export const getAllSymbols = createServerFn({ method: "GET" }).handler(
  async () => {
    const blocks = await loadLiveFloDownBlocks();
    return catalogFromBlocks(blocks).map((symbol) => ({
      id: symbol.id,
      symbolName: symbol.symbolName,
      alias: symbol.alias,
      futureRepo: symbol.futureRepo,
      filePath: symbol.filePath,
      fileName: symbol.fileName,
      language: symbol.language,
      hasConfirmed: symbol.hasConfirmed,
      confirmedById: symbol.confirmedById,
      confirmedBy: symbol.confirmedBy
        ? {
            firstName: symbol.confirmedBy,
            lastName: null,
            email: "",
          }
        : null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }));
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
        symbolName,
        alias,
        selectedSymbolSource,
        selectedSymbolId,
        selectedSymbolUri,
        symbolUri: declaredSymbolUri,
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
        const symbolUri = (declaredSymbolUri ?? "").trim();
        if (!symbolUri) {
          throw new Error("Symbol URI required");
        }

        const onThisBlock = parseDeclaredSymbolsInfo(
          floDownBlock.declaredSymbolsInfo,
        ).some((item) => item.symbolUri === symbolUri);
        linkedExistingSymbol = onThisBlock;

        uri = symbolUri;
      } else {
        if (!selectedSymbolSource) {
          throw new Error("Symbol source required");
        }

        if (selectedSymbolSource === "DB") {
          const uriFromPicker = (selectedSymbolUri ?? selectedSymbolId ?? "").trim();
          if (!uriFromPicker) {
            throw new Error("selectedSymbolUri required");
          }
          uri = uriFromPicker;
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
        await addDeclaredSymbol(tx, floDownBlockId, {
          symbolName: symbolName.trim(),
          symbolUri: uri,
          alias,
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
    const blocks = await loadLiveFloDownBlocks();
    return searchCatalog(blocks, query);
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
        declaredSymbolsInfo: true,
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
