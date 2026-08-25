import prisma from "@/lib/prisma";
import { applyOpaqueUriReplacements } from "@/server/applyOpaqueUriReplacements";
import { currentUser } from "@/server/auth/currentUser";
import { parseDeclaredSymbolsInfo } from "@/server/declaredSymbolsInfo";
import { createServerFn } from "@tanstack/react-start";

type MoveInput = {
  documentId: string;
  futureRepo: string;
  filePath: string;
  language: string;
  uriReplacements?: Array<{ oldUri: string; newUri: string }>;
};

async function requireMovableDocument(documentId: string) {
  const auth = await currentUser();
  if (!auth.loggedIn) throw new Error("Unauthorized");
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, userId: true, futureRepo: true, filePath: true, language: true },
  });
  if (!document) throw new Error("Document not found");
  if (document.userId !== auth.user.id && auth.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return document;
}

async function collectMovingDeclarations(documentId: string) {
  const floDownBlocks = await prisma.floDownBlock.findMany({
    where: { documentId, status: { not: "DISCARDED" } },
    select: { declaredSymbolsInfo: true, fileName: true },
  });
  const declarations: Array<{ symbolName: string; symbolUri: string; fileName: string }> = [];
  for (const block of floDownBlocks) {
    for (const item of parseDeclaredSymbolsInfo(block.declaredSymbolsInfo)) {
      declarations.push({
        symbolName: item.symbolName,
        symbolUri: item.symbolUri,
        fileName: block.fileName,
      });
    }
  }
  return declarations;
}

async function getMovePreview(data: MoveInput) {
  const futureRepo = data.futureRepo.trim();
  const filePath = data.filePath.trim();
  const language = data.language.trim();
  if (!futureRepo || !filePath || !language) throw new Error("Future Repo, File Path, and Language are required");
  const document = await requireMovableDocument(data.documentId);
  const [contentCount, declarations] = await Promise.all([
    prisma.floDownBlock.count({ where: { documentId: data.documentId } }),
    collectMovingDeclarations(data.documentId),
  ]);

  return {
    source: { futureRepo: document.futureRepo, filePath: document.filePath, language: document.language },
    target: { futureRepo, filePath, language },
    contentCount,
    symbolCount: declarations.length,
    declarations,
    conflicts: [] as Array<{ symbolName: string; fileName: string; language: string }>,
    canMove: document.futureRepo !== futureRepo || document.filePath !== filePath || document.language !== language,
  };
}

export const previewDocumentLocationMove = createServerFn({ method: "POST" })
  .inputValidator((data: MoveInput) => data)
  .handler(({ data }) => getMovePreview(data));

export const moveDocumentLocation = createServerFn({ method: "POST" })
  .inputValidator((data: MoveInput) => data)
  .handler(async ({ data }) => {
    const preview = await getMovePreview(data);
    if (!preview.canMove) throw new Error("Document is already at this location");
    const futureRepo = data.futureRepo.trim();
    const filePath = data.filePath.trim();
    const language = data.language.trim();
    await prisma.$transaction(async (tx) => {
      await tx.document.update({ where: { id: data.documentId }, data: { futureRepo, filePath, language } });
      await tx.floDownBlock.updateMany({ where: { documentId: data.documentId }, data: { futureRepo, filePath, language } });
      await tx.latexTable.updateMany({ where: { documentId: data.documentId }, data: { futureRepo, filePath, language } });
      await applyOpaqueUriReplacements(tx, data.uriReplacements ?? []);
    });
    return { success: true as const, contentCount: preview.contentCount, symbolCount: preview.symbolCount };
  });
