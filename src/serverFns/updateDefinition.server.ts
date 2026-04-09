import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { assertFtmlRoot } from "@/server/ftml/convertLocalSymbolToMathHub";
import { parseUri, SemanticOperation, transform } from "@/server/parseUri";
import { createServerFn } from "@tanstack/react-start";

export type UpdateDefinitionAstResult =
  | { kind: "ok" }
  | {
      kind: "pendingPropagation";
      localSymbolUri: string;
      mathHubUri: string;
    };

export const updateDefinitionAst = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { definitionId: string; operation: SemanticOperation }) => data,
  )
  .handler(async ({ data }): Promise<UpdateDefinitionAstResult> => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");
    const userId = userRes.user.id;

    const isLocalToMathHubConversion =
      data.operation.kind === "replaceSemantic" &&
      (data.operation.payload.type === "symref" ||
        (data.operation.payload.type === "definiendum" &&
          data.operation.payload.symdecl === false)) &&
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
        if (!parsed.symbol) {
          throw new Error("Invalid MathHub URI: missing symbol");
        }

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
          payload: {
            ...operation.payload,
            uri: parsed.symbol,
            symdecl: true,
          },
        };
      }

      const newAst = transform(structuredClone(def.statement), operation);
      const nextVersion = def.currentVersion + 1;
      const serialized: object = JSON.parse(JSON.stringify(newAst));

      await tx.definitionVersion.create({
        data: {
          definitionId: def.id,
          versionNumber: nextVersion,
          originalText: def.originalText,
          statement: serialized,
          editedById: userId,
        },
      });

      await tx.definition.update({
        where: { id: def.id },
        data: {
          statement: serialized,
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
    });

    if (isLocalToMathHubConversion && localSymbolUri && mathHubUri) {
      return {
        kind: "pendingPropagation",
        localSymbolUri,
        mathHubUri,
      };
    }

    return { kind: "ok" };
  });
