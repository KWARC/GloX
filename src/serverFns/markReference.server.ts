import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

type CreateMarkReferenceInput = {
  documentId: string;
  documentPageId: string;
  pageNumber: number;
  verbalization: string;
  selectedSymbol:
    | {
        source: "DB";
        id: string;
        symbolName: string;
      }
    | {
        source: "MATHHUB";
        uri: string;
      };
};

export const createMarkReference = createServerFn({ method: "POST" })
  .inputValidator((data: CreateMarkReferenceInput) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const { selectedSymbol } = data;

    const symbolName =
      selectedSymbol.source === "DB"
        ? selectedSymbol.symbolName
        : selectedSymbol.uri;

    return prisma.markReference.create({
      data: {
        documentId: data.documentId,
        documentPageId: data.documentPageId,
        pageNumber: data.pageNumber,
        symbolName,
        verbalization: data.verbalization.trim(),
        createdById: userRes.user.id,
      },
      select: {
        id: true,
        documentPageId: true,
        pageNumber: true,
        symbolName: true,
        verbalization: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

export const listMarkReferences = createServerFn({ method: "POST" })
  .inputValidator((data: { documentId: string }) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    return prisma.markReference.findMany({
      where: { documentId: data.documentId },
      select: {
        id: true,
        documentId: true,
        documentPageId: true,
        pageNumber: true,
        symbolName: true,
        verbalization: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { pageNumber: "asc" },
        { createdAt: "asc" },
      ],
    });
  });
