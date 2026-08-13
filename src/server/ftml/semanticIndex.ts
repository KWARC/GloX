import {
  FloDownStatement,
  normalizeToRoot,
} from "@/types/floDown.types";
import {
  collectDefinienda,
  collectSymrefs,
} from "@/server/ftml/statementContent";

export type DefiniendumInfo = {
  uri: string;
  text: string;
  symbolId: string;
  symdecl: boolean;
};

export type SymbolicRefInfo = {
  uri: string;
  text: string;
};

export function extractSemanticIndex(
  statement: FloDownStatement,
  declaredSymbols: readonly string[] = [],
) {
  normalizeToRoot(statement);

  const definienda = collectDefinienda(statement).map((d) => ({
    ...d,
    symbolId: d.uri,
    symdecl: declaredSymbols.includes(d.uri),
  }));

  const symbolicRefs = collectSymrefs(statement);

  return { definienda, symbolicRefs };
}
