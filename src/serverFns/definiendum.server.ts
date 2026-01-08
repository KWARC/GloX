import { createServerFn } from "@tanstack/react-start";
import prisma from "@/lib/prisma";

export type CreateDefiniendumInput = {
  name: string;
  futureRepo: string;
  filePath: string;
};

export const createDefiniendum = createServerFn<
  any,
  "POST",
  CreateDefiniendumInput,
  Promise<any>
>({ method: "POST" }).handler(async (ctx) => {
  const { name, futureRepo, filePath } = (ctx.data ??
    {}) as CreateDefiniendumInput;
    console.log("Creating definiendum with data:", ctx.data);
  if (!name?.trim() || !filePath?.trim()) {
    throw new Error("Missing definiendum fields");
  }

  const defi = await prisma.definiendum.create({
    data: {
      name,
      futureRepo,
      filePath,
    },
  });

  return defi;
});

export const listDefinienda = createServerFn({ method: "GET" }).handler(
  async () => {
    return prisma.definiendum.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
);