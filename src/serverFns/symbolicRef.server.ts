import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

export type ListSymbolicRefInput = {
  id: string;
};

export type DeleteSymbolicRefInput = {
  id: string;
};
export type CreateSymbolicRefInput = {
  name: string;
  conceptUri: string;
  archive: string;
  filePath: string;
  fileName: string;
  language: string;
  definiendumId: string;
};

export const createSymbolicRef = createServerFn({
  method: "POST",
}).handler(async (ctx: { data?: CreateSymbolicRefInput }) => {
  if (!ctx.data) {
    throw new Error("Missing data");
  }

  return prisma.symbolicReference.create({
    data: ctx.data,
  });
});

export const listSymbolicRef = createServerFn<
  any,
  "POST",
  ListSymbolicRefInput
>({
  method: "POST",
}).handler(async (ctx: { data?: ListSymbolicRefInput }) => {
  const { id } = ctx.data ?? {};

  if (!id?.trim()) {
    throw new Error("Definiendum ID is required");
  }

  return prisma.symbolicReference.findMany({
    where: { id },
    orderBy: { createdAt: "desc" },
  });
});

export const deleteSymbolicRef = createServerFn<
  any,
  "POST",
  DeleteSymbolicRefInput
>({
  method: "POST",
}).handler(async (ctx: { data?: DeleteSymbolicRefInput }) => {
  const { id } = ctx.data ?? {};

  if (!id?.trim()) {
    throw new Error("symbolicReference ID is required");
  }

  await prisma.symbolicReference.delete({
    where: { id },
  });

  return { success: true };
});
