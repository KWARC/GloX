import prisma from "@/lib/prisma";
import { requireAdminOrCurator } from "@/server/auth/requireAdminOrCurator";
import { parseDeclaredSymbolsInfo } from "@/server/declaredSymbolsInfo";
import {
  astReferencesUri,
  retargetUriInAst,
} from "@/server/ftml/retargetUriInAst";
import {
  collectLocalSymbolUriHits,
  parseReplaceLocalSymbolWithMathHubInput,
  retargetLocalSymbolSnapshot,
  type ModuleRetargetRow,
  type RetargetSnapshot,
} from "@/server/ftml/replaceLocalSymbolWithMathHub";
import type { DeclaredSymbolInfo } from "@/types/declaredSymbolsInfo";
import { assertFloDownStatement, FloDownStatement } from "@/types/floDown.types";
import { createServerFn } from "@tanstack/react-start";

export type FloDownUriRetargetCandidate = {
  id: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  pageNumber: number | null;
  statement: FloDownStatement;
  declaredSymbolsInfo: DeclaredSymbolInfo[];
};

export type LocalSymbolUriHitView =
  | {
      kind: "floDown";
      id: string;
      status: string;
      futureRepo: string;
      filePath: string;
      fileName: string;
      language: string;
      pageNumber: number | null;
      statement: FloDownStatement;
      declaredSymbolsInfo: DeclaredSymbolInfo[];
    }
  | {
      kind: "moduleStatement";
      moduleDescriptionId: string;
      moduleId: string;
      field: "title" | "inhalt" | "lernziele";
      statement: FloDownStatement;
    };

function statementForModuleField(
  row: {
    titleStatement: unknown;
    inhaltStatement: unknown;
    lernzieleStatement: unknown;
  },
  field: "title" | "inhalt" | "lernziele",
): unknown {
  if (field === "title") return row.titleStatement;
  if (field === "inhalt") return row.inhaltStatement;
  return row.lernzieleStatement;
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export const listLocalSymbolUriHits = createServerFn({
  method: "POST",
})
  .inputValidator((data: { localSymbolUri: string }) => data)
  .handler(async ({ data }): Promise<LocalSymbolUriHitView[]> => {
    await requireAdminOrCurator();
    const localSymbolUri = data.localSymbolUri.trim();

    const [floDownBlocks, modules] = await Promise.all([
      prisma.floDownBlock.findMany({
        select: {
          id: true,
          status: true,
          statement: true,
          futureRepo: true,
          filePath: true,
          fileName: true,
          language: true,
          pageNumber: true,
          declaredSymbolsInfo: true,
        },
      }),
      prisma.moduleDescription.findMany({
        select: {
          id: true,
          moduleId: true,
          titleStatement: true,
          inhaltStatement: true,
          lernzieleStatement: true,
        },
      }),
    ]);

    const snapshot: RetargetSnapshot = {
      floDown: floDownBlocks.map((row) => ({
        id: row.id,
        status: row.status,
        statement: assertFloDownStatement(row.statement),
        declaredSymbolsInfo: row.declaredSymbolsInfo,
        historicStatements: [],
      })),
      modules: modules.map((row) => ({
        id: row.id,
        moduleId: row.moduleId,
        titleStatement: assertFloDownStatement(row.titleStatement),
        inhaltStatement: assertFloDownStatement(row.inhaltStatement),
        lernzieleStatement: assertFloDownStatement(row.lernzieleStatement),
      })),
    };

    const hits = collectLocalSymbolUriHits(snapshot, localSymbolUri);
    const blocksById = new Map(floDownBlocks.map((row) => [row.id, row]));
    const modulesById = new Map(modules.map((row) => [row.moduleId, row]));

    const views: LocalSymbolUriHitView[] = [];
    for (const hit of hits) {
      if (hit.kind === "floDown") {
        const row = blocksById.get(hit.id);
        if (!row) continue;
        views.push({
          kind: "floDown",
          id: row.id,
          status: row.status,
          futureRepo: row.futureRepo,
          filePath: row.filePath,
          fileName: row.fileName,
          language: row.language,
          pageNumber: row.pageNumber,
          statement: assertFloDownStatement(row.statement),
          declaredSymbolsInfo: parseDeclaredSymbolsInfo(row.declaredSymbolsInfo),
        });
        continue;
      }

      const row = modulesById.get(hit.moduleId);
      if (!row) continue;
      views.push({
        kind: "moduleStatement",
        moduleDescriptionId: row.id,
        moduleId: row.moduleId,
        field: hit.field,
        statement: assertFloDownStatement(statementForModuleField(row, hit.field)),
      });
    }

    return views;
  });

export const getFloDownBlocksReferencingMathHubUri = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: { mathHubUri: string; excludeFloDownBlockId: string }) => data,
  )
  .handler(async ({ data }): Promise<FloDownUriRetargetCandidate[]> => {
    await requireAdminOrCurator();

    const { mathHubUri, excludeFloDownBlockId } = data;

    const floDownBlocks = await prisma.floDownBlock.findMany({
      where: { id: { not: excludeFloDownBlockId } },
      select: {
        id: true,
        statement: true,
        futureRepo: true,
        filePath: true,
        fileName: true,
        language: true,
        pageNumber: true,
        declaredSymbolsInfo: true,
      },
    });

    const candidates: FloDownUriRetargetCandidate[] = [];

    for (const def of floDownBlocks) {
      const ast = assertFloDownStatement(def.statement);
      if (astReferencesUri(ast, mathHubUri)) {
        candidates.push({
          id: def.id,
          futureRepo: def.futureRepo,
          filePath: def.filePath,
          fileName: def.fileName,
          language: def.language,
          pageNumber: def.pageNumber,
          statement: ast,
          declaredSymbolsInfo: parseDeclaredSymbolsInfo(def.declaredSymbolsInfo),
        });
      }
    }

    return candidates;
  });

export const retargetMathHubUriInSelectedBlocks = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: {
      selectedFloDownBlockIds: string[];
      mathHubUri: string;
      newUri: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { id: userId } = await requireAdminOrCurator();

    const { selectedFloDownBlockIds, mathHubUri, newUri } = data;

    if (selectedFloDownBlockIds.length === 0) return { updated: 0 };

    const floDownBlocks = await prisma.floDownBlock.findMany({
      where: { id: { in: selectedFloDownBlockIds } },
      select: {
        id: true,
        statement: true,
        originalText: true,
        currentVersion: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      for (const def of floDownBlocks) {
        const ast = assertFloDownStatement(def.statement);
        const updated = retargetUriInAst(ast, mathHubUri, newUri);

        const nextVersion = def.currentVersion + 1;
        const serialized: FloDownStatement = JSON.parse(JSON.stringify(updated));

        await tx.floDownBlockVersion.create({
          data: {
            floDownBlockId: def.id,
            versionNumber: nextVersion,
            originalText: def.originalText,
            statement: serialized as object,
            editedById: userId,
          },
        });

        await tx.floDownBlock.update({
          where: { id: def.id },
          data: {
            statement: serialized as object,
            updatedById: userId,
            currentVersion: nextVersion,
          },
        });
      }
    });

    return { updated: floDownBlocks.length };
  });

export const replaceLocalSymbolWithMathHub = createServerFn({ method: "POST" })
  .inputValidator((data: Record<string, unknown>) =>
    parseReplaceLocalSymbolWithMathHubInput(data),
  )
  .handler(async ({ data }) => {
    const { id: userId } = await requireAdminOrCurator();
    const { localSymbolUri, mathHubUri } = data;
    if (!localSymbolUri || !mathHubUri) {
      throw new Error("Symbol URI required");
    }

    return prisma.$transaction(async (tx) => {
      const [floDownBlocks, modules] = await Promise.all([
        tx.floDownBlock.findMany({
          select: {
            id: true,
            status: true,
            statement: true,
            originalText: true,
            currentVersion: true,
            declaredSymbolsInfo: true,
          },
        }),
        tx.moduleDescription.findMany({
          select: {
            id: true,
            moduleId: true,
            titleStatement: true,
            inhaltStatement: true,
            lernzieleStatement: true,
          },
        }),
      ]);

      const snapshot: RetargetSnapshot = {
        floDown: floDownBlocks.map((row) => ({
          id: row.id,
          status: row.status,
          statement: assertFloDownStatement(row.statement),
          declaredSymbolsInfo: row.declaredSymbolsInfo,
          historicStatements: [],
        })),
        modules: modules.map(
          (row): ModuleRetargetRow => ({
            id: row.id,
            moduleId: row.moduleId,
            titleStatement: assertFloDownStatement(row.titleStatement),
            inhaltStatement: assertFloDownStatement(row.inhaltStatement),
            lernzieleStatement: assertFloDownStatement(row.lernzieleStatement),
          }),
        ),
      };

      const next = retargetLocalSymbolSnapshot(
        snapshot,
        localSymbolUri,
        mathHubUri,
      );
      const nextBlocks = new Map(next.floDown.map((row) => [row.id, row]));
      const nextModules = new Map(next.modules.map((row) => [row.id, row]));

      let updated = 0;

      for (const before of floDownBlocks) {
        const after = nextBlocks.get(before.id);
        if (!after) continue;
        const statementChanged = !jsonEqual(before.statement, after.statement);
        const declarationChanged = !jsonEqual(
          before.declaredSymbolsInfo,
          after.declaredSymbolsInfo,
        );
        if (!statementChanged && !declarationChanged) continue;

        const payload: {
          statement?: object;
          declaredSymbolsInfo?: object;
          updatedById: string;
          currentVersion?: number;
        } = { updatedById: userId };

        if (statementChanged) {
          const serialized: FloDownStatement = JSON.parse(
            JSON.stringify(after.statement),
          );
          const nextVersion = before.currentVersion + 1;
          await tx.floDownBlockVersion.create({
            data: {
              floDownBlockId: before.id,
              versionNumber: nextVersion,
              originalText: before.originalText,
              statement: serialized as object,
              editedById: userId,
            },
          });
          payload.statement = serialized as object;
          payload.currentVersion = nextVersion;
        }

        if (declarationChanged) {
          payload.declaredSymbolsInfo = after.declaredSymbolsInfo as object;
        }

        await tx.floDownBlock.update({
          where: { id: before.id },
          data: payload,
        });
        updated += 1;
      }

      for (const before of modules) {
        const after = nextModules.get(before.id);
        if (!after) continue;
        if (
          jsonEqual(before.titleStatement, after.titleStatement) &&
          jsonEqual(before.inhaltStatement, after.inhaltStatement) &&
          jsonEqual(before.lernzieleStatement, after.lernzieleStatement)
        ) {
          continue;
        }
        await tx.moduleDescription.update({
          where: { id: before.id },
          data: {
            titleStatement: after.titleStatement as object,
            inhaltStatement: after.inhaltStatement as object,
            lernzieleStatement: after.lernzieleStatement as object,
          },
        });
        updated += 1;
      }

      return { updated };
    });
  });
