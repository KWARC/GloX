import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  astReferencesUri,
  definitionContainsLocalSymbol,
  propagateUriInAst,
} from "@/server/ftml/convertLocalSymbolToMathHub";
import { assertFtmlStatement, FtmlRoot } from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

export type PropagationCandidate = {
  id: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  pageNumber: number;
  statement: FtmlRoot;
};

export const getDefinitionsReferencingSymbol = createServerFn({
  method: "POST",
})
  .inputValidator(
    (data: { localSymbolUri: string; excludeDefinitionId: string }) => data,
  )
  .handler(async ({ data }): Promise<PropagationCandidate[]> => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const { localSymbolUri, excludeDefinitionId } = data;

    const definitions = await prisma.definition.findMany({
      where: { id: { not: excludeDefinitionId } },
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

    for (const def of definitions) {
      const ast = assertFtmlStatement(def.statement);
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

export const applySymbolPropagation = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      selectedDefinitionIds: string[];
      localSymbolUri: string;
      mathHubUri: string;
      primaryDefinitionId: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");
    const userId = userRes.user.id;

    const {
      selectedDefinitionIds,
      localSymbolUri,
      mathHubUri,
      primaryDefinitionId,
    } = data;

    // if (selectedDefinitionIds.length === 0) {
    //   // await _maybeDeleteSymbol(primaryDefinitionId, localSymbolUri);
    //   return { updated: 0 };
    // }

    const definitions = await prisma.definition.findMany({
      where: { id: { in: selectedDefinitionIds } },
      select: {
        id: true,
        statement: true,
        originalText: true,
        currentVersion: true,
      },
    });

    await prisma.$transaction(async (tx) => {
      const updatedAsts: FtmlRoot[] = [];

      for (const def of definitions) {
        const ast = assertFtmlStatement(def.statement);
        const updated = propagateUriInAst(ast, localSymbolUri, mathHubUri);
        updatedAsts.push(updated);

        const nextVersion = def.currentVersion + 1;
        const serialized: FtmlRoot = JSON.parse(JSON.stringify(updated));

        await tx.definitionVersion.create({
          data: {
            definitionId: def.id,
            versionNumber: nextVersion,
            originalText: def.originalText,
            statement: serialized as object,
            editedById: userId,
          },
        });

        await tx.definition.update({
          where: { id: def.id },
          data: {
            statement: serialized as object,
            updatedById: userId,
            currentVersion: nextVersion,
          },
        });
      }
      //TODO: We need better way to delete symbols
      
      // const primaryDef = await tx.definition.findUniqueOrThrow({
      //   where: { id: primaryDefinitionId },
      //   select: { statement: true },
      // });
      // updatedAsts.push(assertFtmlStatement(primaryDef.statement));

      // if (!definitionContainsLocalSymbol(updatedAsts, localSymbolUri)) {
      //   await tx.symbol.deleteMany({ where: { symbolName: localSymbolUri } });
      // }
    });

    return { updated: definitions.length };
  });

// async function _maybeDeleteSymbol(
//   primaryDefinitionId: string,
//   localSymbolUri: string,
// ): Promise<void> {
//   const primaryDef = await prisma.definition.findUnique({
//     where: { id: primaryDefinitionId },
//     select: { statement: true },
//   });

//   if (!primaryDef) return;

//   const ast = assertFtmlStatement(primaryDef.statement);

//   if (!definitionContainsLocalSymbol([ast], localSymbolUri)) {
//     await prisma.symbol.deleteMany({ where: { symbolName: localSymbolUri } });
//   }
// }
