import prisma from "@/lib/prisma";
import { transform, uriToSymbolName } from "@/server/parseUri";
import { createServerFn } from "@tanstack/react-start";

export const updateDefinitionAst = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      definitionId: string;
      operation:
        | {
            kind: "removeSemantic";
            target: { type: "definiendum" | "symref"; uri: string };
          }
        | {
            kind: "replaceSemantic";
            target: { type: "definiendum" | "symref"; uri: string };
            payload: any;
          };
    }) => data,
  )
  .handler(async ({ data }) => {
    await prisma.$transaction(async (tx) => {
      const def = await tx.definition.findUniqueOrThrow({
        where: { id: data.definitionId },
      });

      const newAst = transform(structuredClone(def.statement), data.operation);

      await tx.definition.update({
        where: { id: data.definitionId },
        data: { statement: newAst },
      });

      if (data.operation.kind === "removeSemantic") {
        if (data.operation.target.type === "definiendum") {
          await tx.definiendum.deleteMany({
            where: { symbolName: uriToSymbolName(data.operation.target.uri) },
          });
        }

        if (data.operation.target.type === "symref") {
          await tx.symbolicReference.deleteMany({
            where: { conceptUri: data.operation.target.uri },
          });
        }
      }

      if (data.operation.kind === "replaceSemantic") {
        if (data.operation.target.type === "definiendum") {
          await tx.definiendum.updateMany({
            where: { symbolName: uriToSymbolName(data.operation.target.uri) },
            data: { symbolName: data.operation.payload.content[0] },
          });
        }

        if (data.operation.target.type === "symref") {
          await tx.symbolicReference.updateMany({
            where: { conceptUri: data.operation.target.uri },
            data: { conceptUri: data.operation.payload.uri },
          });
        }
      }
    });
  });
