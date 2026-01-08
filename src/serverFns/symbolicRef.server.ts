import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

export type CreateSymbolicRefInput = {
  name: string;
  conceptUri: string;
  archive?: string;
  filePath: string;
  fileName?: string;
  definiendumId: string;
};

export const createSymbolicRef = createServerFn<
  any,
  "POST",
  CreateSymbolicRefInput,
  Promise<any>
>({ method: "POST" }).handler(async (ctx) => {
  const {
    name,
    conceptUri,
    archive = "Glox",
    filePath,
    fileName = "Glox",
    definiendumId,
  } = (ctx.data ?? {}) as CreateSymbolicRefInput;
  
  console.log("Creating definition with data:", ctx.data);

  if (!name?.trim() || !conceptUri?.trim() || !filePath?.trim() || !definiendumId?.trim()) {
    throw new Error("Missing required definition fields");
  }

  return prisma.definition.create({
    data: {
      name,
      conceptUri,
      archive,
      filePath,
      fileName,
      definiendumId,
    },
  });
});

export const listSymbolicRef = createServerFn<
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

export const deleteSymbolicRef = createServerFn<
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