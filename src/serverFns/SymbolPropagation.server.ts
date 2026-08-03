import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  astReferencesUri,
  propagateUriInAst,
} from "@/server/ftml/convertLocalSymbolToMathHub";
import { assertFloDownStatement, FloDownStatement } from "@/types/floDown.types";
import { createServerFn } from "@tanstack/react-start";

export type PropagationCandidate = {
  id: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  pageNumber: number | null;
  statement: FloDownStatement;
};

export const getFloDownBlocksReferencingSymbol = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: { localSymbolUri: string; excludeFloDownBlockId: string }) => data,
  )
  .handler(async ({ data }): Promise<PropagationCandidate[]> => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const { localSymbolUri, excludeFloDownBlockId } = data;

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
      },
    });

    const candidates: PropagationCandidate[] = [];

    for (const def of floDownBlocks) {
      const ast = assertFloDownStatement(def.statement);
      if (astReferencesUri(ast, localSymbolUri)) {
        candidates.push({
          id: def.id,
          futureRepo: def.futureRepo,
          filePath: def.filePath,
          fileName: def.fileName,
          language: def.language,
          pageNumber: def.pageNumber,
          statement: ast,
        });
      }
    }

    return candidates;
  });

export const getFloDownBlocksReferencingMathHubUri = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: { mathHubUri: string; excludeFloDownBlockId: string }) => data,
  )
  .handler(async ({ data }): Promise<PropagationCandidate[]> => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

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
      },
    });

    const candidates: PropagationCandidate[] = [];

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
        });
      }
    }

    return candidates;
  });

export const applyMathHubReplacement = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      selectedFloDownBlockIds: string[];
      mathHubUri: string;
      newUri: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");
    const userId = userRes.user.id;

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
        const updated = propagateUriInAst(ast, mathHubUri, newUri);

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

export const applySymbolPropagation = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      selectedFloDownBlockIds: string[];
      localSymbolUri: string;
      mathHubUri: string;
      primaryFloDownBlockId: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");
    const userId = userRes.user.id;

    const { selectedFloDownBlockIds, localSymbolUri, mathHubUri } = data;

    // if (selectedFloDownBlockIds.length === 0) {
    //   // await _maybeDeleteSymbol(primaryFloDownBlockId, localSymbolUri);
    //   return { updated: 0 };
    // }

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
      const updatedAsts: FloDownStatement[] = [];

      for (const def of floDownBlocks) {
        const ast = assertFloDownStatement(def.statement);
        const updated = propagateUriInAst(ast, localSymbolUri, mathHubUri);
        updatedAsts.push(updated);

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
      //TODO: We need better way to delete symbols

      // const primaryDef = await tx.floDownBlock.findUniqueOrThrow({
      //   where: { id: primaryFloDownBlockId },
      //   select: { statement: true },
      // });
      // updatedAsts.push(assertFloDownStatement(primaryDef.statement));

      // if (!definitionContainsLocalSymbol(updatedAsts, localSymbolUri)) {
      //   await tx.symbol.deleteMany({ where: { symbolName: localSymbolUri } });
      // }
    });

    return { updated: floDownBlocks.length };
  });

// async function _maybeDeleteSymbol(
//   primaryFloDownBlockId: string,
//   localSymbolUri: string,
// ): Promise<void> {
//   const primaryDef = await prisma.floDownBlock.findUnique({
//     where: { id: primaryFloDownBlockId },
//     select: { statement: true },
//   });

//   if (!primaryDef) return;

//   const ast = assertFloDownStatement(primaryDef.statement);

//   if (!definitionContainsLocalSymbol([ast], localSymbolUri)) {
//     await prisma.symbol.deleteMany({ where: { symbolName: localSymbolUri } });
//   }
// }
