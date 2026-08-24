import { symbolUriFromGlox } from "@/lib/flodownUris";
import type { FloDownStatement } from "@/types/floDown.types";

export type ModuleLocalSymbolSource = {
  declaredSymbols: readonly string[];
  statement: FloDownStatement;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language?: string;
};

/** Names this block declares (E-FTML-06). Definienda are not declarations. */
export function collectDeclaredSymbolsForDefinitionBlock(
  block: Pick<ModuleLocalSymbolSource, "declaredSymbols">,
): string[] {
  const symbols = new Set<string>();

  for (const symbol of block.declaredSymbols) {
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
    for (const label of collectDeclaredSymbolsForDefinitionBlock(block)) {
      if (uriMap.has(label)) continue;
      uriMap.set(
        label,
        symbolUriFromGlox({
          futureRepo: block.futureRepo,
          filePath: block.filePath,
          fileName: block.fileName,
          symbolName: label,
        }),
      );
    }
  }

  return uriMap;
}
