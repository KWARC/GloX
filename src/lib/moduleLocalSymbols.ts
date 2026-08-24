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
  // Remaining issue: invents a MathHub symbol URI without a live FloDown declaration. Preview hover
  // needs the declaration return value (D-FTML-03). Export still uses this map.
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

  // Remaining issue (E-FTML-06): also unions definiendum uris, then buildModuleLocalSymbolUriMap
  // builds a URI from **this** block's file identity. An importing definition (triangle.de.tex)
  // should keep the declaring file's URI, not mint a new one here.
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
