import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

export type CreateDefinitionInput = {
  name: string;
  concept: string;
  archive?: string;
  filePath: string;
  fileName?: string;
  definiendumId: string;
};

export const createDefinition = createServerFn<
  any,
  "POST",
  CreateDefinitionInput,
  Promise<any>
>({ method: "POST" }).handler(async (ctx) => {
  const {
    name,
    concept,
    archive = "Glox",
    filePath,
    fileName = "Glox",
    definiendumId,
  } = (ctx.data ?? {}) as CreateDefinitionInput;
  
  console.log("Creating definition with data:", ctx.data);

  if (!name?.trim() || !concept?.trim() || !filePath?.trim() || !definiendumId?.trim()) {
    throw new Error("Missing required definition fields");
  }

  return prisma.definition.create({
    data: {
      name,
      concept,
      archive,
      filePath,
      fileName,
      definiendumId,
    },
  });
});

export const listDefinitions = createServerFn<
  any,
  "POST",
  { definiendumId: string },
  Promise<any>
>({ method: "POST" }).handler(async (ctx) => {
  const { definiendumId } = (ctx.data ?? {}) as { definiendumId: string };

  if (!definiendumId?.trim()) {
    throw new Error("Definiendum ID is required");
  }

  return prisma.definition.findMany({
    where: {
      definiendumId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
});

export const deleteDefinition = createServerFn<
  any,
  "POST",
  { id: string },
  Promise<any>
>({ method: "POST" }).handler(async (ctx) => {
  const { id } = (ctx.data ?? {}) as { id: string };

  if (!id?.trim()) {
    throw new Error("Definition ID is required");
  }

  await prisma.definition.delete({
    where: {
      id,
    },
  });

  return { success: true };
});