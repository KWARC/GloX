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
    if (item.symbolUri) symbols.add(item.symbolUri);
  }
  for (const symbol of block.declaredSymbols ?? []) {
    const label = symbol.trim();
    if (label.startsWith("http://") || label.startsWith("https://")) {
      symbols.add(label);
    }
  }
  return [...symbols];
}
