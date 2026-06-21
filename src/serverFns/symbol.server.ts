import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  findAllTextOccurrences,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import { findDefiniendum } from "@/server/parseUri";
import {
  assertFtmlStatement,
  FtmlStatement,
  isDefiniendumNode,
  isDefinitionNode,
  isParagraphNode,
  normalizeToRoot,
  RootNode,
  unwrapRoot,
} from "@/types/ftml.types";
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
  definitionId: string;
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
  associatedDefinitions: Array<{
    id: string;
    documentId: string;
    statement: FtmlStatement;
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
  SymbolAssociationSummary["associatedDefinitions"][number];

function definitionMatchesDeclaredSymbol(
  definition: {
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
    statement: unknown;
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
    definition.futureRepo !== symbol.futureRepo ||
    definition.filePath !== symbol.filePath ||
    definition.fileName !== symbol.fileName ||
    definition.language !== symbol.language
  ) {
    return false;
  }

  const root = normalizeToRoot(assertFtmlStatement(definition.statement));

  for (const block of root.content) {
    if (!isDefinitionNode(block)) continue;

    if (
      Array.isArray(block.for_symbols) &&
      block.for_symbols.includes(symbol.symbolName)
    ) {
      return true;
    }

    const stack = [...(block.content ?? [])];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || typeof node === "string") continue;

      if (isDefiniendumNode(node) && node.symdecl === true) {
        if (node.uri === symbol.symbolName) {
          return true;
        }
      }

      if (node.content?.length) {
        stack.push(...node.content);
      }
    }
  }

  return false;
}

function addAssociatedDefinition(
  definitionMap: Map<string, AssociatedDefinitionSummary>,
  definition: AssociatedDefinitionSummary,
) {
  definitionMap.set(definition.id, definition);
}

async function buildSymbolAssociations() {
  const [symbols, definitions] = await Promise.all([
    prisma.symbol.findMany({
      include: {
        symbolicReferences: {
          include: {
            definitions: {
              include: {
                definition: {
                  select: {
                    id: true,
                    documentId: true,
                    statement: true,
                    futureRepo: true,
                    filePath: true,
                    fileName: true,
                    language: true,
                    pageNumber: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { symbolName: "asc" },
        { futureRepo: "asc" },
        { filePath: "asc" },
        { fileName: "asc" },
        { language: "asc" },
      ],
    }),
    prisma.definition.findMany({
      where: { status: { not: "DISCARDED" } },
      select: {
        id: true,
        documentId: true,
        statement: true,
        pageNumber: true,
        futureRepo: true,
        filePath: true,
        fileName: true,
        language: true,
      },
    }),
  ]);

  return symbols.map((symbol) => {
    const definitionMap = new Map<string, AssociatedDefinitionSummary>();

    for (const symbolicReference of symbol.symbolicReferences) {
      for (const relation of symbolicReference.definitions) {
        const definition = relation.definition;
        addAssociatedDefinition(definitionMap, {
          id: definition.id,
          documentId: definition.documentId,
          statement: definition.statement as FtmlStatement,
          futureRepo: definition.futureRepo,
          filePath: definition.filePath,
          fileName: definition.fileName,
          language: definition.language,
          pageNumber: definition.pageNumber,
        });
      }
    }

    for (const definition of definitions) {
      if (!definitionMatchesDeclaredSymbol(definition, symbol)) continue;

      addAssociatedDefinition(definitionMap, {
        id: definition.id,
        documentId: definition.documentId,
        statement: definition.statement as FtmlStatement,
        futureRepo: definition.futureRepo,
        filePath: definition.filePath,
        fileName: definition.fileName,
        language: definition.language,
        pageNumber: definition.pageNumber,
      });
    }

    const associatedDefinitions = Array.from(definitionMap.values());

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
      associatedDefinitions,
      associatedDefinitionCount: associatedDefinitions.length,
      canDelete: associatedDefinitions.length === 0,
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
        definitionId,
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

      if (!definitionId || !selectedText.trim()) {
        throw new Error("Invalid input");
      }

      const definition = await tx.definition.findUnique({
        where: { id: definitionId },
      });

      if (!definition?.statement) {
        throw new Error("Content not found");
      }

      let uri: string;
      if (symdecl) {
        if (!symbolName.trim()) {
          throw new Error("Symbol name required");
        }

        await tx.symbol.create({
          data: {
            symbolName: symbolName.trim(),
            alias: alias?.trim() || null,
            futureRepo: futureRepo.trim(),
            filePath: filePath.trim(),
            fileName: fileName.trim(),
            language: language.trim(),
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
        assertFtmlStatement(definition.statement),
      );

      const firstNode = root.content[0];

      if (!isDefinitionNode(firstNode)) {
        throw new Error("Expected definition node at root");
      }

      const definitionNode = firstNode;

      const firstContent = definitionNode.content?.[0];

      if (
        !firstContent ||
        typeof firstContent === "string" ||
        !isParagraphNode(firstContent)
      ) {
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

      const definiendumNode = {
        type: "definiendum",
        uri,
        content: [alias || selectedText],
        symdecl,
      };

      const updatedRoot = replaceTextWithNode(
        root,
        location,
        data.startOffset,
        data.endOffset,
        definiendumNode,
      );

      const updatedDefinition = updatedRoot.content.find(isDefinitionNode);

      if (!updatedDefinition) {
        throw new Error("Content not found after update");
      }

      const existingSymbols = updatedDefinition.for_symbols ?? [];

      if (!existingSymbols.includes(uri)) {
        updatedDefinition.for_symbols = [...existingSymbols, uri];
      }

      const existing = await tx.definition.findUniqueOrThrow({
        where: { id: definitionId },
      });

      const nextVersion = existing.currentVersion + 1;
      const newStatement = JSON.parse(JSON.stringify(unwrapRoot(updatedRoot)));

      await tx.definitionVersion.create({
        data: {
          definitionId,
          versionNumber: nextVersion,
          originalText: existing.originalText,
          statement: newStatement,
          editedById: userId,
        },
      });

      await tx.definition.update({
        where: { id: definitionId },
        data: {
          statement: newStatement,
          updatedById: userId,
          currentVersion: nextVersion,
        },
      });
      return { ok: true };
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

export const getDefinitionBySymbol = createServerFn({ method: "POST" })
  .inputValidator((symbolName: string) => symbolName)
  .handler(async ({ data: symbolName }) => {
    const defs = await prisma.definition.findMany({
      select: {
        id: true,
        statement: true,
      },
    });

    for (const def of defs) {
      const root = normalizeToRoot(assertFtmlStatement(def.statement));

      for (const node of root.content) {
        if (!isDefinitionNode(node)) continue;

        if (node.content && findDefiniendum(node.content, symbolName)) {
          return def;
        }
      }
    }

    return null;
  });
