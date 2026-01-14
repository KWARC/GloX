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
  definiendumId: string | null;
};

export const createSymbolicRef = createServerFn({ method: "POST" })
  .inputValidator((data: CreateSymbolicRefInput) => data)
  .handler(async ({ data }) => {
    const {
      name,
      conceptUri,
      archive,
      filePath,
      fileName,
      language,
      definiendumId,
    } = data;

    if (
      !name?.trim() ||
      !conceptUri?.trim() ||
      !archive?.trim() ||
      !filePath?.trim() ||
      !fileName?.trim() ||
      !language?.trim()
    ) {
      throw new Error("Missing symbolic reference fields");
    }

    return prisma.symbolicReference.create({
      data: {
        name,
        conceptUri,
        archive,
        filePath,
        fileName,
        language,
        definiendumId,
      },
    });
  });

export const listSymbolicRef = createServerFn({ method: "POST" })
  .inputValidator((data: ListSymbolicRefInput) => data)
  .handler(async ({ data }) => {
    const { id } = data;

    if (!id?.trim()) {
      throw new Error("Symbolic reference ID is required");
    }

    return prisma.symbolicReference.findMany({
      where: { id },
      orderBy: { createdAt: "desc" },
    });
  });

export const deleteSymbolicRef = createServerFn({ method: "POST" })
  .inputValidator((data: DeleteSymbolicRefInput) => data)
  .handler(async ({ data }) => {
    const { id } = data;

    if (!id?.trim()) {
      throw new Error("Symbolic reference ID is required");
    }

    await prisma.symbolicReference.delete({
      where: { id }, // TODO: If later you intend to list by definiendumId, you would change only this line:
    });

    return { success: true };
  });
