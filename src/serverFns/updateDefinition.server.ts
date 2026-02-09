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
          await tx.definiendum.deleteMany({
            where: {
              symbolName: uriToSymbolName(data.operation.target.uri),
            },
          });
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
          await tx.definiendum.updateMany({
            where: {
              symbolName: uriToSymbolName(data.operation.target.uri),
            },
            data: {
              symbolName: data.operation.payload.content?.[0] as string,
            },
          });
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
