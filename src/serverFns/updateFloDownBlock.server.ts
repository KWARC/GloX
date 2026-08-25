import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { declaredUrisFromJson } from "@/server/declaredSymbolsInfo";
import { sanitizeStatementForPersist } from "@/server/ftml/declaredSymbols";
import {
  addDeclaredSymbol,
  removeDeclaredSymbol,
} from "@/server/floDownBlockDeclaredSymbols";
import { SemanticOperation, transform } from "@/server/parseUri";
import { assertFloDownStatement } from "@/types/floDown.types";
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
    (data: { floDownBlockId: string; operation: SemanticOperation }) => data,
  )
  .handler(async ({ data }): Promise<UpdateFloDownBlockAstResult> => {
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
      const def = await tx.floDownBlock.findUniqueOrThrow({
        where: { id: data.floDownBlockId },
      });
      assertFloDownStatement(def.statement);

      const operation = data.operation;

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
        await addDeclaredSymbol(tx, def.id, {
          symbolName:
            (Array.isArray(operation.payload.content)
              ? operation.payload.content.find(
                  (item): item is string => typeof item === "string",
                )
              : undefined)?.trim() || uri,
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
