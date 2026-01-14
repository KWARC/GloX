import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

export type CreateDefinitionSymbolicRefInput = {
  definitionId: string;
  symbolicReferenceId: string;
  source: "MATHHUB";
};

export const createDefinitionSymbolicRef = createServerFn({ method: "POST" })
  .inputValidator((data: CreateDefinitionSymbolicRefInput) => data)
  .handler(async ({ data }) => {
    const { definitionId, symbolicReferenceId, source } = data;

    if (!definitionId || !symbolicReferenceId || !source) {
      throw new Error("Missing DefinitionSymbolicRef fields");
    }

    return prisma.definitionSymbolicRef.create({
      data: {
        definitionId,
        symbolicReferenceId,
        source,
      },
    });
  });
