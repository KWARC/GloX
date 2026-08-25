import prisma from "@/lib/prisma";
import { documentFloDownBlockWhere } from "@/server/floDownBlockProvenance";
import { currentUser } from "@/server/auth/currentUser";
import {
  getModuleJson,
  getModuleSearchEntry,
  searchModules,
  seedStatementsFromCatalog,
} from "@/server/modules/moduleCatalog";
import {
  findAllTextOccurrences,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import { extractPlainText } from "@/server/ftml/statementContent";
import { declaredUrisFromJson } from "@/server/declaredSymbolsInfo";
import { sanitizeStatementForPersist } from "@/server/ftml/declaredSymbols";
import { addDeclaredSymbol } from "@/server/floDownBlockDeclaredSymbols";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { parseUri, SemanticOperation, transform } from "@/server/parseUri";
import {
  assertFloDownStatement,
  DefinitionNode,
  FloDownStatement,
  normalizeToRoot,
  SymrefNode,
  unwrapRoot,
} from "@/types/floDown.types";
import { ExtractBlockType } from "@/types/blockType";
import type { IndexStatus } from "@/types/indexStatus";
import { createServerFn } from "@tanstack/react-start";
import type { Prisma } from "generated/prisma/client";
import type { UpdateFloDownBlockAstResult } from "@/serverFns/updateFloDownBlock.server";

type ModuleStatementField =
  | "titleStatement"
  | "inhaltStatement"
  | "lernzieleStatement";

const DEFAULT_FUTURE_REPO = "courses/FAU/module-descriptions";
const DEFAULT_MODULES_PATH = "modules";
const DEFAULT_DEFS_PATH = "defs";
const DEFAULT_LANGUAGE = "de";

async function requireExtractorPlus() {
  const userRes = await currentUser();
  if (!userRes.loggedIn) throw new Error("Unauthorized");
  const role = userRes.user.role;
  if (role !== "ADMIN" && role !== "CURATOR" && role !== "EXTRACTOR") {
    throw new Error("Forbidden");
  }
  return { userId: userRes.user.id, role };
}

async function requireCuratorOrAdmin() {
  const userRes = await currentUser();
  if (!userRes.loggedIn) throw new Error("Unauthorized");
  const role = userRes.user.role;
  if (role !== "ADMIN" && role !== "CURATOR") {
    throw new Error("Forbidden");
  }
  return userRes.user.id;
}

function titleFromStatement(statement: unknown): string {
  try {
    return extractPlainText(assertFloDownStatement(statement)).trim();
  } catch {
    return "";
  }
}

function buildPlainDefinitionStatement(originalText: string): DefinitionNode {
  return {
    type: "definition",
    for_symbols: [],
    content: [
      {
        type: "paragraph",
        content: [originalText],
      },
    ],
  };
}

async function cleanupOrphanedModuleSymbols(
  _moduleDescriptionId: string,
): Promise<void> {
  return;
}

type ModuleDescriptionWithBlocks = Prisma.ModuleDescriptionGetPayload<{
  include: {
    floDownBlocks: true;
  };
}>;

export type ModuleDescriptionTexExportInput = {
  moduleId: string;
  language: string;
  titleStatement: FloDownStatement;
  inhaltStatement: FloDownStatement;
  lernzieleStatement: FloDownStatement;
  futureRepo: string;
  modulesFilePath: string;
  definitionBlocks: Array<{
    id: string;
    statement: FloDownStatement;
    declaredSymbols: readonly string[];
    declaredSymbolsInfo?: object;
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  }>;
};

function toTexExportInput(
  row: ModuleDescriptionWithBlocks,
): ModuleDescriptionTexExportInput {
  return {
    moduleId: row.moduleId,
    language: row.language,
    titleStatement: assertFloDownStatement(row.titleStatement),
    inhaltStatement: assertFloDownStatement(row.inhaltStatement),
    lernzieleStatement: assertFloDownStatement(row.lernzieleStatement),
    futureRepo: row.futureRepo,
    modulesFilePath: row.modulesFilePath,
    definitionBlocks: row.floDownBlocks.map((block) => ({
      id: block.id,
      statement: assertFloDownStatement(block.statement),
      declaredSymbols: declaredUrisFromJson(block.declaredSymbolsInfo),
      declaredSymbolsInfo:
        block.declaredSymbolsInfo == null
          ? undefined
          : (block.declaredSymbolsInfo as object),
      futureRepo: block.futureRepo,
      filePath: block.filePath,
      fileName: block.fileName,
      language: block.language,
    })),
  };
}

export const searchModuleDescriptions = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    await requireExtractorPlus();
    return searchModules(data.query ?? "");
  });

export const getModuleDescriptionPage = createServerFn({ method: "POST" })
  .inputValidator((data: { moduleId: string }) => data)
  .handler(async ({ data }) => {
    await requireExtractorPlus();

    const moduleId = data.moduleId.trim();
    let catalog;
    let catalogError: string | null = null;

    try {
      catalog = await getModuleJson(moduleId);
    } catch (error) {
      catalogError = (error as Error).message;
      catalog = null;
    }

    const searchEntry = await getModuleSearchEntry(moduleId);

    const dbRow = await prisma.moduleDescription.findUnique({
      where: { moduleId },
      include: {
        floDownBlocks: {
          where: { documentId: null },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return {
      moduleId,
      searchEntry,
      catalog,
      catalogError,
      moduleDescription: dbRow
        ? {
            id: dbRow.id,
            moduleId: dbRow.moduleId,
            titleStatement: assertFloDownStatement(dbRow.titleStatement),
            inhaltStatement: assertFloDownStatement(dbRow.inhaltStatement),
            lernzieleStatement: assertFloDownStatement(
              dbRow.lernzieleStatement,
            ),
            futureRepo: dbRow.futureRepo,
            modulesFilePath: dbRow.modulesFilePath,
            defsFilePath: dbRow.defsFilePath,
            language: dbRow.language,
            indexStatus: dbRow.indexStatus,
            definitionBlocks: dbRow.floDownBlocks.map((block) => ({
              id: block.id,
              originalText: block.originalText,
              statement: assertFloDownStatement(block.statement),
              declaredSymbols: declaredUrisFromJson(block.declaredSymbolsInfo),
              declaredSymbolsInfo: block.declaredSymbolsInfo,
              futureRepo: block.futureRepo,
              filePath: block.filePath,
              fileName: block.fileName,
              language: block.language,
              status: block.status,
            })),
          }
        : null,
    };
  });

export const createModuleDescription = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      moduleId: string;
      futureRepo?: string;
      modulesFilePath?: string;
      defsFilePath?: string;
      language?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireExtractorPlus();

    const moduleId = data.moduleId.trim();
    const existing = await prisma.moduleDescription.findUnique({
      where: { moduleId },
    });
    if (existing) {
      throw new Error("Module description already exists");
    }

    const catalog = await getModuleJson(moduleId);
    const statements = seedStatementsFromCatalog(catalog);

    const row = await prisma.moduleDescription.create({
      data: {
        moduleId,
        titleStatement: JSON.parse(JSON.stringify(statements.titleStatement)),
        inhaltStatement: JSON.parse(JSON.stringify(statements.inhaltStatement)),
        lernzieleStatement: JSON.parse(
          JSON.stringify(statements.lernzieleStatement),
        ),
        futureRepo: data.futureRepo?.trim() || DEFAULT_FUTURE_REPO,
        modulesFilePath: data.modulesFilePath?.trim() || DEFAULT_MODULES_PATH,
        defsFilePath: data.defsFilePath?.trim() || DEFAULT_DEFS_PATH,
        language: data.language?.trim() || DEFAULT_LANGUAGE,
        createdById: userId,
      },
    });

    return { id: row.id, moduleId: row.moduleId };
  });

export const updateModuleDescriptionStatement = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      moduleDescriptionId: string;
      field: ModuleStatementField;
      statement: FloDownStatement;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireExtractorPlus();

    const statement = sanitizeStatementForPersist(data.statement);
    const serialized = JSON.parse(JSON.stringify(statement));

    await prisma.moduleDescription.update({
      where: { id: data.moduleDescriptionId },
      data: { [data.field]: serialized },
    });

    return { ok: true };
  });

export const updateModuleDescriptionAst = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      moduleDescriptionId: string;
      field: ModuleStatementField;
      operation: SemanticOperation;
    }) => data,
  )
  .handler(async ({ data }): Promise<UpdateFloDownBlockAstResult> => {
    await requireExtractorPlus();

    const row = await prisma.moduleDescription.findUniqueOrThrow({
      where: { id: data.moduleDescriptionId },
    });

    const current = assertFloDownStatement(row[data.field]);
    const newAst = sanitizeStatementForPersist(
      assertFloDownStatement(
        transform(structuredClone(current), data.operation),
      ),
    );
    const serialized = JSON.parse(JSON.stringify(newAst));

    await prisma.moduleDescription.update({
      where: { id: data.moduleDescriptionId },
      data: { [data.field]: serialized },
    });

    return { kind: "ok" };
  });

export const moduleDescriptionSymbolicRef = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      moduleDescriptionId: string;
      field: ModuleStatementField;
      selection: { text: string; startOffset: number; endOffset: number };
      symRef: UnifiedSymbolicReference;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireExtractorPlus();

    const row = await prisma.moduleDescription.findUniqueOrThrow({
      where: { id: data.moduleDescriptionId },
    });

    const currentStatement = assertFloDownStatement(row[data.field]);
    const root = normalizeToRoot(currentStatement);

    const occurrences = findAllTextOccurrences(root, data.selection.text);
    const location = occurrences.find(
      (loc) => loc.offset === data.selection.startOffset,
    );
    if (!location) {
      throw new Error("Exact selection match not found in AST");
    }

    const targetPath = [location.paragraphIndex, location.contentIndex];
    if (pathTraversesSemanticNode(root, targetPath)) {
      throw new Error("Cannot insert symref inside existing semantic node");
    }

    let uri: string;
    if (data.symRef.source === "MATHHUB") {
      uri = parseUri(data.symRef.uri).conceptUri ?? data.symRef.uri;
    } else {
      uri = (data.symRef.symbolUri ?? "").trim() || data.symRef.symbolName;
    }

    const symrefNode: SymrefNode = {
      type: "symref",
      uri,
      content: [data.selection.text],
    };

    const updatedRoot = replaceTextWithNode(
      root,
      location,
      data.selection.startOffset,
      data.selection.endOffset,
      symrefNode,
    );

    const statement = sanitizeStatementForPersist(unwrapRoot(updatedRoot));
    await prisma.moduleDescription.update({
      where: { id: data.moduleDescriptionId },
      data: {
        [data.field]: JSON.parse(JSON.stringify(statement)),
      },
    });

    return { ok: true, statement };
  });

export const createModuleDefinitionBlock = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      moduleDescriptionId: string;
      paragraphFileName: string;
      originalText: string;
      statement?: FloDownStatement;
      symbolName: string;
      symbolUri?: string;
      existingSymbolId?: string;
      blockType?: ExtractBlockType;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireExtractorPlus();

    const moduleDesc = await prisma.moduleDescription.findUniqueOrThrow({
      where: { id: data.moduleDescriptionId },
    });

    const paragraphFileName = data.paragraphFileName.trim();
    const originalText = data.originalText.trim();
    const symbolName = data.symbolName.trim();
    const existingSymbolId = data.existingSymbolId?.trim();
    const symbolUri = data.symbolUri?.trim() || existingSymbolId;

    if (!paragraphFileName || !originalText || !symbolName) {
      throw new Error("Missing definition fields");
    }

    const rawStatement =
      data.statement ?? buildPlainDefinitionStatement(originalText);
    const statement = sanitizeStatementForPersist(rawStatement);
    const serializedStatement = JSON.parse(JSON.stringify(statement));
    const isNewSymbol = !existingSymbolId;
    if (isNewSymbol && !symbolUri) {
      throw new Error("Symbol URI required");
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdFloDownBlock = await tx.floDownBlock.create({
        data: {
          moduleDescriptionId: moduleDesc.id,
          originalText,
          statement: serializedStatement,
          futureRepo: moduleDesc.futureRepo,
          filePath: moduleDesc.defsFilePath,
          fileName: paragraphFileName,
          language: moduleDesc.language,
          createdById: userId,
          updatedById: userId,
          currentVersion: 1,
          status: "EXTRACTED",
        },
      });

      await tx.floDownBlockVersion.create({
        data: {
          floDownBlockId: createdFloDownBlock.id,
          versionNumber: 1,
          originalText,
          statement: serializedStatement,
          editedById: userId,
        },
      });

      if (isNewSymbol && symbolUri) {
        await addDeclaredSymbol(tx, createdFloDownBlock.id, {
          symbolName,
          symbolUri,
        });
      }

      return {
        id: createdFloDownBlock.id,
        statement: assertFloDownStatement(createdFloDownBlock.statement),
        declaredSymbols: declaredUrisFromJson(createdFloDownBlock.declaredSymbolsInfo),
        futureRepo: createdFloDownBlock.futureRepo,
        filePath: createdFloDownBlock.filePath,
        fileName: createdFloDownBlock.fileName,
        language: createdFloDownBlock.language,
        symbol: {
          id: symbolUri ?? existingSymbolId ?? symbolName,
          symbolName,
        },
      };
    });

    return result;
  });

export const deleteModuleDescription = createServerFn({ method: "POST" })
  .inputValidator((data: { moduleDescriptionId: string }) => data)
  .handler(async ({ data }) => {
    await requireExtractorPlus();

    const row = await prisma.moduleDescription.findUnique({
      where: { id: data.moduleDescriptionId },
      select: { id: true, moduleId: true },
    });
    if (!row) throw new Error("Module description not found");

    await cleanupOrphanedModuleSymbols(row.id);
    await prisma.moduleDescription.delete({ where: { id: row.id } });

    return { moduleId: row.moduleId };
  });

export const resetModuleSemantics = createServerFn({ method: "POST" })
  .inputValidator((data: { moduleDescriptionId: string }) => data)
  .handler(async ({ data }) => {
    await requireExtractorPlus();

    const row = await prisma.moduleDescription.findUniqueOrThrow({
      where: { id: data.moduleDescriptionId },
    });

    const catalog = await getModuleJson(row.moduleId);
    const statements = seedStatementsFromCatalog(catalog);

    await cleanupOrphanedModuleSymbols(row.id);

    await prisma.$transaction(async (tx) => {
      await tx.floDownBlock.deleteMany({
        where: { moduleDescriptionId: row.id },
      });

      await tx.moduleDescription.update({
        where: { id: row.id },
        data: {
          titleStatement: JSON.parse(JSON.stringify(statements.titleStatement)),
          inhaltStatement: JSON.parse(
            JSON.stringify(statements.inhaltStatement),
          ),
          lernzieleStatement: JSON.parse(
            JSON.stringify(statements.lernzieleStatement),
          ),
        },
      });
    });

    return { ok: true };
  });

export const listModuleDescriptions = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      page?: number;
      pageSize?: number;
      status?: IndexStatus | null;
      query?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await requireExtractorPlus();

    const page = Math.max(1, data.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, data.pageSize ?? 20));
    const query = data.query?.trim() ?? "";

    const where = {
      ...(data.status ? { indexStatus: data.status } : {}),
      ...(query
        ? {
            OR: [
              { moduleId: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.moduleDescription.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          moduleId: true,
          titleStatement: true,
          indexStatus: true,
          language: true,
          updatedAt: true,
        },
      }),
      prisma.moduleDescription.count({ where }),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => {
        const searchEntry = await getModuleSearchEntry(row.moduleId);
        const title =
          searchEntry?.title ||
          titleFromStatement(row.titleStatement) ||
          row.moduleId;

        return {
          id: row.id,
          moduleId: row.moduleId,
          title,
          indexStatus: row.indexStatus,
          language: row.language,
          updatedAt: row.updatedAt.toISOString(),
        };
      }),
    );

    return { items, total, page, pageSize };
  });

export const listModuleDescriptionsForTexExport = createServerFn({ method: "POST" }).handler(
  async (): Promise<ModuleDescriptionTexExportInput[]> => {
    await requireCuratorOrAdmin();

    const rows = await prisma.moduleDescription.findMany({
      orderBy: [{ moduleId: "asc" }],
      include: {
        floDownBlocks: {
          where: { documentId: null },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return rows.map(toTexExportInput);
  },
);

export const updateModuleDescriptionIndexStatus = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: { moduleDescriptionId: string; indexStatus: IndexStatus }) => data,
  )
  .handler(async ({ data }) => {
    await requireCuratorOrAdmin();

    const row = await prisma.moduleDescription.update({
      where: { id: data.moduleDescriptionId },
      data: { indexStatus: data.indexStatus },
      select: { id: true, moduleId: true, indexStatus: true },
    });

    return row;
  });

// Re-export for queries that should only see document blocks
export { documentFloDownBlockWhere };
