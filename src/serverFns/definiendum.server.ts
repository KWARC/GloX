import { createServerFn } from "@tanstack/react-start";
import prisma from "@/lib/prisma";

type CreateDefiniendumInput = {
  name: string;
  futureRepo: string;
  filePath: string;
};

export const createDefiniendum = createServerFn({
  method: "POST",
}).handler(async (input: CreateDefiniendumInput) => {
  const { name, futureRepo, filePath } = input;

  if (!name.trim()) {
    throw new Error("Definiendum name is required");
  }

  return prisma.definiendum.create({
    data: {
      name: name.trim(),
      futureRepo,
      filePath,
    },
  });
});