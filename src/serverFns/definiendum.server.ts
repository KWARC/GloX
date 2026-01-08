import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

export type CreateDefiniendumInput = {
  symbolName: string;
  alias?: string;
  symbolDeclared?: boolean;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const createDefiniendum = createServerFn<
  any,
  "POST",
  CreateDefiniendumInput,
  Promise<any>
>({ method: "POST" }).handler(async (ctx) => {
  const {
    symbolName,
    alias,
    symbolDeclared = true,
    futureRepo,
    filePath,
    fileName,
    language,
  } = (ctx.data ?? {}) as CreateDefiniendumInput;
  console.log("Creating definiendum with data:", ctx.data);

  if (!symbolName?.trim() || !futureRepo?.trim() || !filePath?.trim()) {
    throw new Error("Missing definiendum fields");
  }

  return prisma.definiendum.create({
    data: {
      symbolName,
      alias,
      symbolDeclared,
      futureRepo,
      filePath,
      fileName,
      language,
    },
  });
});

export const listDefinienda = createServerFn({ method: "GET" }).handler(
  async () => {
    return prisma.definiendum.findMany({
      orderBy: { createdAt: "desc" },
    });
  }
);
