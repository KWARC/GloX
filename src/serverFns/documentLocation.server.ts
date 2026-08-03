import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { getInlineContent, walkInlines } from "@/server/ftml/statementContent";
import {
  assertFloDownStatement,
  isDefiniendumNode,
  normalizeToRoot,
} from "@/types/floDown.types";
import { createServerFn } from "@tanstack/react-start";

type MoveInput = { documentId: string; futureRepo: string; filePath: string; language: string };

type MovingSymbol = {
  id: string;
  symbolName: string;
  fileName: string;
  language: string;
};

function declaredSymbols(statement: unknown) {
  const symbols = new Set<string>();
  const root = normalizeToRoot(assertFloDownStatement(statement));

  for (const block of root.content) {
    walkInlines(getInlineContent(block), (item) => {
      if (isDefiniendumNode(item) && item.symdecl && item.uri) {
        symbols.add(item.uri);
      }
    });
  }

  return symbols;
}

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

async function collectMovingSymbols(documentId: string): Promise<MovingSymbol[]> {
  const floDownBlocks = await prisma.floDownBlock.findMany({
    where: { documentId },
    select: { statement: true, futureRepo: true, filePath: true, fileName: true, language: true },
  });
  const targets = new Map<string, { futureRepo: string; filePath: string; fileName: string; language: string }>();
  for (const floDownBlock of floDownBlocks) {
    for (const symbolName of declaredSymbols(floDownBlock.statement)) {
      targets.set(
        `${symbolName}\u0000${floDownBlock.futureRepo}\u0000${floDownBlock.filePath}\u0000${floDownBlock.fileName}\u0000${floDownBlock.language}`,
        { futureRepo: floDownBlock.futureRepo, filePath: floDownBlock.filePath, fileName: floDownBlock.fileName, language: floDownBlock.language },
      );
    }
  }
  const symbols = await Promise.all(Array.from(targets.entries()).map(async ([key, location]) => {
    const [symbolName] = key.split("\u0000");
    return prisma.symbol.findUnique({
      where: { symbolName_futureRepo_filePath_fileName_language: { symbolName, ...location } },
      select: { id: true, symbolName: true, fileName: true, language: true },
    });
  }));
  return symbols.filter((symbol): symbol is MovingSymbol => symbol !== null);
}

async function getMovePreview(data: MoveInput) {
  const futureRepo = data.futureRepo.trim();
  const filePath = data.filePath.trim();
  const language = data.language.trim();
  if (!futureRepo || !filePath || !language) throw new Error("Future Repo, File Path, and Language are required");
  const document = await requireMovableDocument(data.documentId);
  const [contentCount, movingSymbols] = await Promise.all([
    prisma.floDownBlock.count({ where: { documentId: data.documentId } }),
    collectMovingSymbols(data.documentId),
  ]);
  const movingIds = new Set(movingSymbols.map((symbol) => symbol.id));
  const keys = new Map<string, MovingSymbol[]>();
  for (const symbol of movingSymbols) {
    const key = `${symbol.symbolName}\u0000${symbol.fileName}`;
    keys.set(key, [...(keys.get(key) ?? []), symbol]);
  }
  const destinationMatches = await Promise.all(movingSymbols.map((symbol) => prisma.symbol.findUnique({
    where: { symbolName_futureRepo_filePath_fileName_language: {
      symbolName: symbol.symbolName, futureRepo, filePath, fileName: symbol.fileName, language,
    } },
    select: { id: true, symbolName: true, fileName: true, language: true },
  })));
  const conflicts = [
    ...destinationMatches
      .filter((symbol): symbol is NonNullable<typeof symbol> => !!symbol && !movingIds.has(symbol.id))
      .map((symbol) => ({ symbolName: symbol.symbolName, fileName: symbol.fileName, language: symbol.language })),
    ...Array.from(keys.values()).filter((symbols) => symbols.length > 1).map((symbols) => ({
      symbolName: symbols[0].symbolName, fileName: symbols[0].fileName, language,
    })),
  ].filter((conflict, index, all) => all.findIndex((other) =>
    other.symbolName === conflict.symbolName && other.fileName === conflict.fileName && other.language === conflict.language,
  ) === index);

  return {
    source: { futureRepo: document.futureRepo, filePath: document.filePath, language: document.language },
    target: { futureRepo, filePath, language },
    contentCount,
    symbolCount: movingSymbols.length,
    conflicts,
    canMove: conflicts.length === 0 && (document.futureRepo !== futureRepo || document.filePath !== filePath || document.language !== language),
  };
}

export const previewDocumentLocationMove = createServerFn({ method: "POST" })
  .inputValidator((data: MoveInput) => data)
  .handler(({ data }) => getMovePreview(data));

export const moveDocumentLocation = createServerFn({ method: "POST" })
  .inputValidator((data: MoveInput) => data)
  .handler(async ({ data }) => {
    const preview = await getMovePreview(data);
    if (preview.conflicts.length) throw new Error("Destination contains conflicting symbols");
    if (!preview.canMove) throw new Error("Document is already at this location");
    const movingSymbols = await collectMovingSymbols(data.documentId);
    const futureRepo = data.futureRepo.trim();
    const filePath = data.filePath.trim();
    const language = data.language.trim();
    await prisma.$transaction(async (tx) => {
      await tx.document.update({ where: { id: data.documentId }, data: { futureRepo, filePath, language } });
      await tx.floDownBlock.updateMany({ where: { documentId: data.documentId }, data: { futureRepo, filePath, language } });
      await tx.latexTable.updateMany({ where: { documentId: data.documentId }, data: { futureRepo, filePath, language } });
      for (const symbol of movingSymbols) {
        await tx.symbol.update({ where: { id: symbol.id }, data: { futureRepo, filePath, language } });
      }
    });
    return { success: true as const, contentCount: preview.contentCount, symbolCount: preview.symbolCount };
  });
