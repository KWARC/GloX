import type { Prisma } from "generated/prisma/client";
import {
  parseDeclaredSymbolsInfo,
  replaceDeclarationUri,
} from "@/server/declaredSymbolsInfo";
import {
  replaceOpaqueUrisInValue,
  replacementMapFromPairs,
} from "@/server/opaqueSymbolUriReplace";

export async function applyOpaqueUriReplacements(
  tx: Prisma.TransactionClient,
  pairs: Array<{ oldUri: string; newUri: string }>,
): Promise<void> {
  const map = replacementMapFromPairs(pairs);
  if (map.size === 0) return;

  const blocks = await tx.floDownBlock.findMany({
    select: { id: true, statement: true, declaredSymbolsInfo: true },
  });
  for (const block of blocks) {
    let info = parseDeclaredSymbolsInfo(block.declaredSymbolsInfo);
    for (const [oldUri, newUri] of map) {
      info = replaceDeclarationUri(info, oldUri, newUri);
    }
    await tx.floDownBlock.update({
      where: { id: block.id },
      data: {
        statement: replaceOpaqueUrisInValue(block.statement, map) as object,
        declaredSymbolsInfo: info,
      },
    });
  }

  const modules = await tx.moduleDescription.findMany({
    select: {
      id: true,
      titleStatement: true,
      inhaltStatement: true,
      lernzieleStatement: true,
    },
  });
  for (const row of modules) {
    await tx.moduleDescription.update({
      where: { id: row.id },
      data: {
        titleStatement: replaceOpaqueUrisInValue(row.titleStatement, map) as object,
        inhaltStatement: replaceOpaqueUrisInValue(row.inhaltStatement, map) as object,
        lernzieleStatement: replaceOpaqueUrisInValue(row.lernzieleStatement, map) as object,
      },
    });
  }
}
