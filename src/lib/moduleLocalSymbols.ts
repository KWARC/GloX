import { parseDeclaredSymbolsInfo } from "@/server/declaredSymbolsInfo";
import type { FloDownStatement } from "@/types/floDown.types";

export type ModuleLocalSymbolSource = {
  declaredSymbols?: readonly string[];
  declaredSymbolsInfo?: unknown;
  statement: FloDownStatement;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language?: string;
};

/** Names this block declares (E-FTML-06). Definienda are not declarations. */
export function collectDeclaredSymbolsForDefinitionBlock(
  block: Pick<ModuleLocalSymbolSource, "declaredSymbols" | "declaredSymbolsInfo">,
): string[] {
  const symbols = new Set<string>();
  for (const item of parseDeclaredSymbolsInfo(block.declaredSymbolsInfo)) {
    if (item.symbolName) symbols.add(item.symbolName);
    if (item.symbolUri) symbols.add(item.symbolUri);
  }
  for (const symbol of block.declaredSymbols ?? []) {
    const label = symbol.trim();
    if (label) symbols.add(label);
  }
  return [...symbols];
}

export function buildModuleLocalSymbolUriMap(
  definitionBlocks: readonly ModuleLocalSymbolSource[],
): Map<string, string> {
  const uriMap = new Map<string, string>();

  for (const block of definitionBlocks) {
    for (const item of parseDeclaredSymbolsInfo(block.declaredSymbolsInfo)) {
      if (!uriMap.has(item.symbolName)) {
        uriMap.set(item.symbolName, item.symbolUri);
      }
      uriMap.set(item.symbolUri, item.symbolUri);
    }
    for (const label of block.declaredSymbols ?? []) {
      if (label.startsWith("http://") || label.startsWith("https://")) {
        if (!uriMap.has(label)) uriMap.set(label, label);
      }
    }
  }

  return uriMap;
}
