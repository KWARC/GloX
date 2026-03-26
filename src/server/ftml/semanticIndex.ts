import { extractTextContent } from "@/server/ftml/astOperations";
import {
  FtmlNode,
  FtmlRoot,
  isDefiniendumNode,
  normalizeToRoot,
} from "@/types/ftml.types";

export type DefiniendumInfo = {
  uri: string;
  text: string;
  symbolId: string;
  symdecl: boolean;
};

export type SymbolicRefInfo = {
  uri: string;
  text: string;
  symbolicRefId: string;
};

function walk(
  node: FtmlNode | FtmlNode[],
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
  statement: FtmlRoot,
  definition: {
    symbolicRefs?: {
      symbolicReference: { id: string; conceptUri: string };
    }[];
  },
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
    symdecl: d.symdecl,
  }));

  const symbolicRefs = collected.symrefs.map((r) => {
    const match = definition.symbolicRefs?.find(
      (x) => x.symbolicReference.conceptUri === r.uri,
    );

    if (!match) {
      return {
        ...r,
        symbolicRefId: null,
        unlinked: true,
      };
    }
    return {
      ...r,
      symbolicRefId: match.symbolicReference.id,
    };
  });

  return { definienda, symbolicRefs };
}
