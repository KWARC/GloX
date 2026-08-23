import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  sanitizeStatementForPersist,
  syncDeclaredSymbolsFromDefinienda,
} from "@/server/ftml/declaredSymbols";
import {
  addDeclaredSymbol,
  removeDeclaredSymbol,
  setDeclaredSymbols,
} from "@/server/floDownBlockDeclaredSymbols";
import { parseUri, SemanticOperation, transform } from "@/server/parseUri";
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

        const currentDef = await tx.floDownBlock.findUniqueOrThrow({
          where: { id: data.floDownBlockId },
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
        operation.payload.symdecl === true &&
        !operation.payload.uri.startsWith("http")
      ) {
        await addDeclaredSymbol(
          tx,
          def.id,
          operation.payload.uri,
          {
            futureRepo: def.futureRepo,
            filePath: def.filePath,
            fileName: def.fileName,
            language: def.language,
          },
        );
      }

      if (
        operation.kind === "removeSemantic" &&
        operation.target.type === "definiendum" &&
        def.declaredSymbols.includes(operation.target.uri)
      ) {
        await removeDeclaredSymbol(
          tx,
          def.id,
          operation.target.uri,
          {
            futureRepo: def.futureRepo,
            filePath: def.filePath,
            fileName: def.fileName,
            language: def.language,
          },
        );
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

      const syncedDeclared = syncDeclaredSymbolsFromDefinienda(
        newAst,
        def.declaredSymbols,
      );
      if (
        syncedDeclared.length !== def.declaredSymbols.length ||
        syncedDeclared.some(
          (symbol, index) => symbol !== def.declaredSymbols[index],
        )
      ) {
        await setDeclaredSymbols(tx, def.id, syncedDeclared, {
          futureRepo: def.futureRepo,
          filePath: def.filePath,
          fileName: def.fileName,
          language: def.language,
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
