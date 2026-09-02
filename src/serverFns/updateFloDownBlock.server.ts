import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  catalogDeclaresUri,
  declaredUrisFromJson,
} from "@/server/declaredSymbolsInfo";
import { sanitizeStatementForPersist } from "@/server/ftml/declaredSymbols";
import {
  addDeclaredSymbol,
  removeDeclaredSymbol,
} from "@/server/floDownBlockDeclaredSymbols";
import { SemanticOperation, transform } from "@/server/parseUri";
import { assertFloDownStatement } from "@/types/floDown.types";
import { assertFloDownBlockAllowsSemanticMutation } from "@/server/modules/moduleDuplicateGuards";
import { createServerFn } from "@tanstack/react-start";

export type UpdateFloDownBlockAstResult =
  | { kind: "ok" }
  | {
      kind: "pendingPropagation";
      localSymbolUri: string;
      mathHubUri: string;
    };

export const updateFloDownBlockAst = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      floDownBlockId: string;
      operation: SemanticOperation;
      declaredSymbolName?: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<UpdateFloDownBlockAstResult> => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");
    const userId = userRes.user.id;

    let isLocalToMathHubConversion = false;
    let localSymbolUri: string | null = null;
    let mathHubUri: string | null = null;

    await prisma.$transaction(async (tx) => {
      const def = await tx.floDownBlock.findUniqueOrThrow({
        where: { id: data.floDownBlockId },
      });
      await assertFloDownBlockAllowsSemanticMutation(
        tx,
        def.moduleDescriptionId,
      );
      assertFloDownStatement(def.statement);

      const operation = data.operation;
      const declared = declaredUrisFromJson(def.declaredSymbolsInfo);

      if (operation.kind === "replaceSemantic") {
        const liveCatalogRows = await tx.floDownBlock.findMany({
          select: { declaredSymbolsInfo: true, status: true },
        });
        isLocalToMathHubConversion =
          (operation.payload.type === "symref" ||
            (operation.payload.type === "definiendum" &&
              operation.payload.symdecl === false)) &&
          declared.includes(operation.target.uri) &&
          !catalogDeclaresUri(liveCatalogRows, operation.payload.uri);

        localSymbolUri = isLocalToMathHubConversion
          ? operation.target.uri
          : null;
        mathHubUri =
          isLocalToMathHubConversion &&
          operation.payload.type === "definiendum"
            ? operation.payload.uri
            : null;
      }

      const newAst = sanitizeStatementForPersist(
        assertFloDownStatement(
          transform(structuredClone(assertFloDownStatement(def.statement)), operation),
        ),
      );
      const nextVersion = def.currentVersion + 1;
      const serialized: object = JSON.parse(JSON.stringify(newAst));

      if (
        operation.kind === "replaceSemantic" &&
        operation.payload.type === "definiendum" &&
        operation.payload.symdecl === true
      ) {
        const uri = operation.payload.uri.trim();
        if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
          throw new Error("Symbol URI required");
        }
        const symbolName = data.declaredSymbolName?.trim();
        if (!symbolName) {
          throw new Error("Symbol name required");
        }
        await addDeclaredSymbol(tx, def.id, {
          symbolName,
          symbolUri: uri,
        });
      }

      if (
        operation.kind === "removeSemantic" &&
        operation.target.type === "definiendum" &&
        declaredUrisFromJson(def.declaredSymbolsInfo).includes(operation.target.uri)
      ) {
        await removeDeclaredSymbol(tx, def.id, operation.target.uri);
      }

      await tx.floDownBlockVersion.create({
        data: {
          floDownBlockId: def.id,
          versionNumber: nextVersion,
          originalText: def.originalText,
          statement: serialized,
          editedById: userId,
        },
      });

      await tx.floDownBlock.update({
        where: { id: def.id },
        data: {
          statement: serialized,
          updatedById: userId,
          currentVersion: nextVersion,
        },
      });
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
