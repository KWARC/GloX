import {
  matchesCatalogQuery,
  parseDeclaredSymbolsInfo,
} from "@/server/declaredSymbolsInfo";
import type { DeclaredSymbolInfo } from "@/types/declaredSymbolsInfo";
import prisma from "@/lib/prisma";
import { assertFloDownStatement } from "@/types/floDown.types";

export type CatalogSymbol = {
  id: string;
  symbolName: string;
  alias: string | null;
  symbolUri: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  hasConfirmed: boolean;
  confirmedById: string | null;
  confirmedBy: string | null;
  floDownBlockId: string;
};

type BlockRow = {
  id: string;
  documentId: string | null;
  statement: unknown;
  declaredSymbolsInfo: unknown;
  pageNumber: number | null;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  status: string;
};

function hitFrom(
  block: BlockRow,
  item: DeclaredSymbolInfo,
): CatalogSymbol {
  return {
    id: item.symbolUri,
    symbolName: item.symbolName,
    alias: item.alias ?? null,
    symbolUri: item.symbolUri,
    futureRepo: block.futureRepo,
    filePath: block.filePath,
    fileName: block.fileName,
    language: block.language,
    hasConfirmed: item.hasConfirmed,
    confirmedById: item.confirmedById,
    confirmedBy: item.confirmedBy,
    floDownBlockId: block.id,
  };
}

export async function loadLiveFloDownBlocks(): Promise<BlockRow[]> {
  return prisma.floDownBlock.findMany({
    where: { status: { not: "DISCARDED" } },
    select: {
      id: true,
      documentId: true,
      statement: true,
      declaredSymbolsInfo: true,
      pageNumber: true,
      futureRepo: true,
      filePath: true,
      fileName: true,
      language: true,
      status: true,
    },
  });
}

export function catalogFromBlocks(blocks: readonly BlockRow[]): CatalogSymbol[] {
  const byUri = new Map<string, CatalogSymbol>();
  for (const block of blocks) {
    for (const item of parseDeclaredSymbolsInfo(block.declaredSymbolsInfo)) {
      if (!byUri.has(item.symbolUri)) {
        byUri.set(item.symbolUri, hitFrom(block, item));
      }
    }
  }
  return [...byUri.values()].sort((a, b) =>
    a.symbolName.localeCompare(b.symbolName),
  );
}

export function searchCatalog(
  blocks: readonly BlockRow[],
  query: string,
): CatalogSymbol[] {
  const hits: CatalogSymbol[] = [];
  for (const block of blocks) {
    for (const item of parseDeclaredSymbolsInfo(block.declaredSymbolsInfo)) {
      if (!matchesCatalogQuery(item, query)) continue;
      hits.push(hitFrom(block, item));
    }
  }
  return hits.slice(0, 10);
}

export function associatedBlocksForUri(
  blocks: readonly BlockRow[],
  symbolUri: string,
) {
  return blocks
    .filter((block) =>
      parseDeclaredSymbolsInfo(block.declaredSymbolsInfo).some(
        (item) => item.symbolUri === symbolUri,
      ),
    )
    .map((block) => ({
      id: block.id,
      documentId: block.documentId,
      statement: assertFloDownStatement(block.statement),
      futureRepo: block.futureRepo,
      filePath: block.filePath,
      fileName: block.fileName,
      language: block.language,
      pageNumber: block.pageNumber,
    }));
}
