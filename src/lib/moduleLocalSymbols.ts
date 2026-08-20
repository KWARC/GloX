import { collectDefiniendumUris } from "@/server/ftml/statementContent";
import {
  symbolIdentityFromGlox,
  symbolUri,
} from "@/lib/flodownUris";
import type { FloDownStatement } from "@/types/floDown.types";

export type ModuleLocalSymbolSource = {
  declaredSymbols: readonly string[];
  statement: FloDownStatement;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language?: string;
};

export function buildLocalSymbolUri(
  futureRepo: string,
  filePath: string,
  fileName: string,
  symbolName: string,
): string {
  return symbolUri(
    symbolIdentityFromGlox({
      futureRepo,
      filePath,
      fileName,
      symbolName,
    }),
  );
}

export function collectDeclaredSymbolsForDefinitionBlock(
  block: Pick<ModuleLocalSymbolSource, "declaredSymbols" | "statement">,
): string[] {
  const symbols = new Set<string>();

  for (const symbol of block.declaredSymbols) {
    const label = symbol.trim();
    if (label) symbols.add(label);
  }

  for (const uri of collectDefiniendumUris(block.statement)) {
    if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
      symbols.add(uri);
    }
  }

  return [...symbols];
}

export function buildModuleLocalSymbolUriMap(
  definitionBlocks: readonly ModuleLocalSymbolSource[],
): Map<string, string> {
  const uriMap = new Map<string, string>();

  for (const block of definitionBlocks) {
    for (const label of collectDeclaredSymbolsForDefinitionBlock(block)) {
      if (uriMap.has(label)) continue;
      uriMap.set(
        label,
        buildLocalSymbolUri(
          block.futureRepo,
          block.filePath,
          block.fileName,
          label,
        ),
      );
    }
  }

  return uriMap;
}
