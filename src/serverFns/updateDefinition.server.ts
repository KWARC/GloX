import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { transform } from "@/server/parseUri";
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
    throw new Error("Invalid FTML AST");
  }
}

export const updateDefinitionAst = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { definitionId: string; operation: SemanticOperation }) => data,
  )
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const userId = userRes.user.id;
    await prisma.$transaction(async (tx) => {
      const def = await tx.definition.findUniqueOrThrow({
        where: { id: data.definitionId },
      });

      assertFtmlRoot(def.statement);

      const newAst = transform(structuredClone(def.statement), data.operation);
      const nextVersion = def.currentVersion + 1;
      await tx.definitionVersion.create({
        data: {
          definitionId: def.id,
          versionNumber: nextVersion,
          originalText: def.originalText,
          statement: JSON.parse(JSON.stringify(newAst)),
          editedById: userId,
        },
      });

      await tx.definition.update({
        where: { id: def.id },
        data: {
          statement: JSON.parse(JSON.stringify(newAst)),
          updatedById: userId,
          currentVersion: nextVersion,
        },
      });

      if (data.operation.kind === "removeSemantic") {
        if (data.operation.target.type === "symref") {
          await tx.symbolicReference.deleteMany({
            where: { conceptUri: data.operation.target.uri },
          });
        }
      }

      if (data.operation.kind === "replaceSemantic") {
        if (data.operation.target.type === "symref") {
          await tx.symbolicReference.updateMany({
            where: { conceptUri: data.operation.target.uri },
            data: { conceptUri: data.operation.payload.uri! },
          });
        }
      }
    });
  });
