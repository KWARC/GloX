import {
  createDeclarationRecord,
  draftsFromHttpUris,
  otherBlockDeclaresUri,
  parseDeclaredSymbolsInfo,
  removeDeclarationByUri,
  upsertDeclaration,
} from "@/server/declaredSymbolsInfo";
import type { DeclaredSymbolDraft } from "@/types/declaredSymbolsInfo";
import type { Prisma } from "generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

async function loadLiveDeclarationRows(
  tx: TransactionClient,
): Promise<Array<{ id: string; declaredSymbolsInfo: unknown; status: string }>> {
  return tx.floDownBlock.findMany({
    select: {
      id: true,
      declaredSymbolsInfo: true,
      status: true,
    },
  });
}

export async function setDeclaredSymbolsInfo(
  tx: TransactionClient,
  floDownBlockId: string,
  drafts: readonly DeclaredSymbolDraft[],
): Promise<void> {
  const rows = await loadLiveDeclarationRows(tx);
  const records = drafts.map((draft) => createDeclarationRecord(draft));
  const seen = new Set<string>();

  for (const record of records) {
    if (seen.has(record.symbolUri)) {
      throw new Error("Duplicate symbol URI in declaration list");
    }
    seen.add(record.symbolUri);
    if (otherBlockDeclaresUri(rows, floDownBlockId, record.symbolUri)) {
      throw new Error("Symbol URI already declared on another block");
    }
  }

  await tx.floDownBlock.update({
    where: { id: floDownBlockId },
    data: {
      declaredSymbolsInfo: records,
    },
  });
}

export async function addDeclaredSymbol(
  tx: TransactionClient,
  floDownBlockId: string,
  draft: DeclaredSymbolDraft,
): Promise<void> {
  const record = createDeclarationRecord(draft);
  const block = await tx.floDownBlock.findUniqueOrThrow({
    where: { id: floDownBlockId },
    select: { declaredSymbolsInfo: true },
  });
  const current = parseDeclaredSymbolsInfo(block.declaredSymbolsInfo);
  if (current.some((item) => item.symbolUri === record.symbolUri)) {
    return;
  }

  const rows = await loadLiveDeclarationRows(tx);
  if (otherBlockDeclaresUri(rows, floDownBlockId, record.symbolUri)) {
    throw new Error("Symbol URI already declared on another block");
  }

  const next = upsertDeclaration(current, draft);
  await tx.floDownBlock.update({
    where: { id: floDownBlockId },
    data: {
      declaredSymbolsInfo: next,
    },
  });
}

export async function removeDeclaredSymbol(
  tx: TransactionClient,
  floDownBlockId: string,
  symbolUri: string,
): Promise<void> {
  const block = await tx.floDownBlock.findUniqueOrThrow({
    where: { id: floDownBlockId },
    select: { declaredSymbolsInfo: true },
  });
  const next = removeDeclarationByUri(
    parseDeclaredSymbolsInfo(block.declaredSymbolsInfo),
    symbolUri,
  );
  await tx.floDownBlock.update({
    where: { id: floDownBlockId },
    data: {
      declaredSymbolsInfo: next,
    },
  });
}

/** @deprecated Prefer setDeclaredSymbolsInfo. Ignores short names (does not mint URIs). */
export async function setDeclaredSymbols(
  tx: TransactionClient,
  floDownBlockId: string,
  names: string[],
  _identity?: unknown,
): Promise<string[]> {
  const drafts = draftsFromHttpUris(names);
  await setDeclaredSymbolsInfo(tx, floDownBlockId, drafts);
  return drafts.map((draft) => draft.symbolUri);
}
