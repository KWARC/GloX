import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  assertFtmlRoot,
  astReferencesUri,
  definitionContainsLocalSymbol,
  propagateUriInAst,
} from "@/server/ftml/convertLocalSymbolToMathHub";
import { parseUri, SemanticOperation, transform } from "@/server/parseUri";
import { assertFtmlStatement, FtmlRoot } from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

export const updateDefinitionAst = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { definitionId: string; operation: SemanticOperation }) => data,
  )
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");
    const userId = userRes.user.id;

    const isLocalToMathHubConversion =
      data.operation.kind === "replaceSemantic" &&
      data.operation.payload.type === "definiendum" &&
      data.operation.payload.symdecl === false &&
      data.operation.payload.uri.startsWith("http") &&
      !data.operation.target.uri.startsWith("http");

    const localSymbolUri: string | null = isLocalToMathHubConversion
      ? data.operation.target.uri
      : null;

    const mathHubUri: string | null =
      isLocalToMathHubConversion &&
      data.operation.kind === "replaceSemantic" &&
      data.operation.payload.type === "definiendum"
        ? data.operation.payload.uri
        : null;

    await prisma.$transaction(async (tx) => {
      const def = await tx.definition.findUniqueOrThrow({
        where: { id: data.definitionId },
      });
      assertFtmlRoot(def.statement);

      let operation = data.operation;

      if (
        operation.kind === "replaceSemantic" &&
        operation.payload.type === "definiendum" &&
        operation.payload.symdecl === true &&
        operation.payload.uri.startsWith("http")
      ) {
        const parsed = parseUri(operation.payload.uri);
        if (!parsed.symbol)
          throw new Error("Invalid MathHub URI: missing symbol");

        const currentDef = await tx.definition.findUniqueOrThrow({
          where: { id: data.definitionId },
        });
        await tx.symbol.upsert({
          where: {
            symbolName_futureRepo_filePath_fileName_language: {
              symbolName: parsed.symbol,
              futureRepo: currentDef.futureRepo,
              filePath: currentDef.filePath,
              fileName: currentDef.fileName,
              language: currentDef.language,
            },
          },
          update: {},
          create: {
            symbolName: parsed.symbol,
            futureRepo: currentDef.futureRepo,
            filePath: currentDef.filePath,
            fileName: currentDef.fileName,
            language: currentDef.language,
          },
        });

        operation = {
          ...operation,
          payload: { ...operation.payload, uri: parsed.symbol, symdecl: true },
        };
      }

      const newAst = transform(structuredClone(def.statement), operation);
      const nextVersion = def.currentVersion + 1;
      const serializedPrimary = JSON.parse(JSON.stringify(newAst));

      await tx.definitionVersion.create({
        data: {
          definitionId: def.id,
          versionNumber: nextVersion,
          originalText: def.originalText,
          statement: serializedPrimary,
          editedById: userId,
        },
      });

      await tx.definition.update({
        where: { id: def.id },
        data: {
          statement: serializedPrimary,
          updatedById: userId,
          currentVersion: nextVersion,
        },
      });

      if (
        data.operation.kind === "removeSemantic" &&
        data.operation.target.type === "symref"
      ) {
        await tx.symbolicReference.deleteMany({
          where: { conceptUri: data.operation.target.uri },
        });
      }

      if (
        data.operation.kind === "replaceSemantic" &&
        data.operation.target.type === "symref"
      ) {
        await tx.symbolicReference.updateMany({
          where: { conceptUri: data.operation.target.uri },
          data: { conceptUri: data.operation.payload.uri },
        });
      }

      if (!isLocalToMathHubConversion || !localSymbolUri || !mathHubUri) return;

      const siblings = await tx.definition.findMany({
        where: { id: { not: data.definitionId } },
        select: {
          id: true,
          statement: true,
          originalText: true,
          currentVersion: true,
        },
      });

      const allUpdatedAsts: FtmlRoot[] = [
        assertFtmlStatement(serializedPrimary),
      ];

      for (const sibling of siblings) {
        assertFtmlRoot(sibling.statement);
        const siblingAst = assertFtmlStatement(sibling.statement);

        if (!astReferencesUri(siblingAst, localSymbolUri)) {
          allUpdatedAsts.push(siblingAst);
          continue;
        }

        const updatedAst = propagateUriInAst(
          siblingAst,
          localSymbolUri,
          mathHubUri,
        );
        allUpdatedAsts.push(updatedAst);

        const siblingNextVersion = sibling.currentVersion + 1;
        const serialized = JSON.parse(JSON.stringify(updatedAst));

        await tx.definitionVersion.create({
          data: {
            definitionId: sibling.id,
            versionNumber: siblingNextVersion,
            originalText: sibling.originalText,
            statement: serialized,
            editedById: userId,
          },
        });

        await tx.definition.update({
          where: { id: sibling.id },
          data: {
            statement: serialized,
            updatedById: userId,
            currentVersion: siblingNextVersion,
          },
        });
      }

      if (!definitionContainsLocalSymbol(allUpdatedAsts, localSymbolUri)) {
        await tx.symbol.deleteMany({ where: { symbolName: localSymbolUri } });
      }
    });
  });
