import prisma from "@/lib/prisma";
import type {
  CreateDefinitionInput,
  UpdateDefinitionInput,
} from "@/server/document/document.types";
import { createServerFn } from "@tanstack/react-start";

export const createDefinition = createServerFn<
  any,
  "POST",
  CreateDefinitionInput,
  Promise<any>
>({ method: "POST" }).handler(async (ctx) => {
  const {
    documentId,
    documentPageId,
    pageNumber,
    originalText,
    statement,
    futureRepo,
    filePath,
    fileName,
    language,
  } = (ctx.data ?? {}) as CreateDefinitionInput;

  if (
    !documentId ||
    !documentPageId ||
    typeof pageNumber !== "number" ||
    !originalText?.trim() ||
    !statement?.trim() ||
    !futureRepo?.trim() ||
    !filePath?.trim() ||
    !fileName?.trim() ||
    !language?.trim()
  ) {
    throw new Error("Missing definition fields");
  }

  const definition = await prisma.definition.create({
    data: {
      documentId,
      documentPageId,
      pageNumber,
      originalText,
      statement,
      futureRepo,
      filePath,
      fileName,
      language,
    },
  });

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "TEXT_EXTRACTED" },
  });

  return definition;
});

export const listDefinition = createServerFn({ method: "GET" }).handler(
  async (ctx) => {
    const data = (ctx.data ?? {}) as Partial<{ documentId: string }>;

    if (!data.documentId) {
      throw new Error("documentId is required");
    }

    return prisma.definition.findMany({
      where: { documentId: data.documentId },
      orderBy: { createdAt: "asc" },
      include: {
        symbolicRefs: {
          include: {
            symbolicReference: true,
          },
        },
      },
    });
  }
);

export const updateDefinition = createServerFn<
  any,
  "POST",
  UpdateDefinitionInput,
  Promise<any>
>({ method: "POST" }).handler(async (ctx) => {
  const data = (ctx.data ?? {}) as Partial<UpdateDefinitionInput>;

  if (!data.id || !data.statement?.trim()) {
    throw new Error("Missing update fields");
  }

  return prisma.definition.update({
    where: { id: data.id },
    data: { statement: data.statement },
  });
});
