import { extractTextContent } from "@/server/ftml/astOperations";
import {
  FloDownNode,
  FloDownStatement,
  isDefiniendumNode,
  normalizeToRoot,
} from "@/types/floDown.types";

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

function walk(
  node: FloDownNode | FloDownNode[],
  acc: {
    definienda: { uri: string; text: string; symdecl: boolean }[];
    symrefs: { uri: string; text: string }[];
  },
): void {
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, acc));
    return;
  }
  if (isDefiniendumNode(node)) {
    acc.definienda.push({
      uri: node.uri!,
      text: extractTextContent(node.content ?? []),
      symdecl: !!node.symdecl,
    });
  }

  if (node.type === "symref") {
    acc.symrefs.push({
      uri: node.uri!,
      text: extractTextContent(node.content ?? []),
    });
  }

  if (node.content) {
    node.content.forEach((c) => {
      if (typeof c !== "string") {
        walk(c, acc);
      }
    });
  }
}

export function extractSemanticIndex(
  statement: FloDownStatement,
  declaredSymbols: readonly string[] = [],
) {
  const root = normalizeToRoot(statement);

  const collected = {
    definienda: [] as { uri: string; text: string; symdecl: boolean }[],
    symrefs: [] as { uri: string; text: string }[],
  };

  walk(root.content, collected);

  const definienda = collected.definienda.map((d) => ({
    ...d,
    symbolId: d.uri,
    symdecl: declaredSymbols.includes(d.uri),
  }));

  return { definienda, symbolicRefs: collected.symrefs };
}
