import type { Prisma } from "generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

type FileIdentity = {
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

/**
 * v1 orphan policy: leave Symbol rows when removed from declaredSymbols.
 * Rows are upserted when names are added.
 */
export async function setDeclaredSymbols(
  tx: TransactionClient,
  floDownBlockId: string,
  names: string[],
  identity: FileIdentity,
): Promise<string[]> {
  const deduped = [
    ...new Set(names.map((name) => name.trim()).filter(Boolean)),
  ];

  await tx.floDownBlock.update({
    where: { id: floDownBlockId },
    data: { declaredSymbols: deduped },
  });

  for (const symbolName of deduped) {
    await tx.symbol.upsert({
      where: {
        symbolName_futureRepo_filePath_fileName_language: {
          symbolName,
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,
        },
      },
      update: {},
      create: {
        symbolName,
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        fileName: identity.fileName,
        language: identity.language,
      },
    });
  }

  return deduped;
}

export async function addDeclaredSymbol(
  tx: TransactionClient,
  floDownBlockId: string,
  symbolName: string,
  identity: FileIdentity,
): Promise<string[]> {
  const block = await tx.floDownBlock.findUniqueOrThrow({
    where: { id: floDownBlockId },
    select: { declaredSymbols: true },
  });

  if (block.declaredSymbols.includes(symbolName)) {
    return block.declaredSymbols;
  }

  return setDeclaredSymbols(
    tx,
    floDownBlockId,
    [...block.declaredSymbols, symbolName],
    identity,
  );
}

export async function removeDeclaredSymbol(
  tx: TransactionClient,
  floDownBlockId: string,
  symbolName: string,
  identity: FileIdentity,
): Promise<string[]> {
  const block = await tx.floDownBlock.findUniqueOrThrow({
    where: { id: floDownBlockId },
    select: { declaredSymbols: true },
  });

  return setDeclaredSymbols(
    tx,
    floDownBlockId,
    block.declaredSymbols.filter((name) => name !== symbolName),
    identity,
  );
}
