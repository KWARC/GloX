import prisma from "@/lib/prisma";
import { transform, uriToSymbolName } from "@/server/parseUri";
import { FtmlNode, FtmlRoot } from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

type RemoveSemanticOp = {
  kind: "removeSemantic";
  target: { type: "definiendum" | "symref"; uri: string };
};

type ReplaceSemanticOp = {
  kind: "replaceSemantic";
  target: { type: "definiendum" | "symref"; uri: string };
  payload: FtmlNode;
};

type SemanticOperation = RemoveSemanticOp | ReplaceSemanticOp;

function assertFtmlRoot(value: unknown): asserts value is FtmlRoot {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid FTML AST: expected non-null object");
  }
}

export const updateDefinitionAst = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { definitionId: string; operation: SemanticOperation }) => data,
  )
  .handler(async ({ data }) => {
    await prisma.$transaction(async (tx) => {
      const def = await tx.definition.findUniqueOrThrow({
        where: { id: data.definitionId },
      });

      const rawStatement = def.statement;

      assertFtmlRoot(rawStatement);

      const newAst = transform(structuredClone(rawStatement), data.operation);

      await tx.definition.update({
        where: { id: data.definitionId },
        data: {
          statement: JSON.parse(JSON.stringify(newAst)),
        },
      });

      if (data.operation.kind === "removeSemantic") {
        if (data.operation.target.type === "definiendum") {

          const symbols = await tx.symbol.findMany({
            where: {
              OR: [
                { symbolName: uriToSymbolName(data.operation.target.uri) },
                { resolvedUri: data.operation.target.uri },
              ],
            },
          });

          if (symbols.length > 0) {
            await tx.definitionSymbol.deleteMany({
              where: {
                definitionId: data.definitionId,
                symbolId: { in: symbols.map((s) => s.id) },
              },
            });
          }
        }

        if (data.operation.target.type === "symref") {
          await tx.symbolicReference.deleteMany({
            where: {
              conceptUri: data.operation.target.uri,
            },
          });
        }
      }

      if (data.operation.kind === "replaceSemantic") {
        if (data.operation.target.type === "definiendum") {
          const oldSymbols = await tx.symbol.findMany({
            where: {
              OR: [
                { symbolName: uriToSymbolName(data.operation.target.uri) },
                { resolvedUri: data.operation.target.uri },
              ],
            },
          });

          if (oldSymbols.length > 0 && data.operation.payload.uri) {
            const newSymbols = await tx.symbol.findMany({
              where: {
                OR: [
                  { symbolName: uriToSymbolName(data.operation.payload.uri) },
                  { resolvedUri: data.operation.payload.uri },
                ],
              },
            });

            if (newSymbols.length > 0) {
              await tx.definitionSymbol.deleteMany({
                where: {
                  definitionId: data.definitionId,
                  symbolId: { in: oldSymbols.map((s) => s.id) },
                },
              });

              await tx.definitionSymbol.create({
                data: {
                  definitionId: data.definitionId,
                  symbolId: newSymbols[0].id,
                  isDeclared: false,
                },
              });
            }
          }
        }

        if (data.operation.target.type === "symref") {
          await tx.symbolicReference.updateMany({
            where: {
              conceptUri: data.operation.target.uri,
            },
            data: {
              conceptUri: data.operation.payload.uri!,
            },
          });
        }
      }
    });
  });
