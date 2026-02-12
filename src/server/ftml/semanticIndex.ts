import { extractTextContent } from "@/server/ftml/astOperations";
import { FtmlRoot, normalizeToRoot } from "@/types/ftml.types";

export type DefiniendumInfo = {
  uri: string;
  text: string;
  symbolId: string;
};

export type SymbolicRefInfo = {
  uri: string;
  text: string;
  symbolicRefId: string;
};

function walk(
  node: any,
  acc: {
    definienda: { uri: string; text: string }[];
    symrefs: { uri: string; text: string }[];
  },
) {
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, acc));
    return;
  }
  if (!node || typeof node !== "object") return;

  if (node.type === "definiendum") {
    acc.definienda.push({
      uri: node.uri,
      text: extractTextContent(node.content),
    });
  }

  if (node.type === "symref") {
    acc.symrefs.push({
      uri: node.uri,
      text: extractTextContent(node.content),
    });
  }

  if (node.content) walk(node.content, acc);
}

export function extractSemanticIndex(
  statement: FtmlRoot,
  definition: {
    definitionSymbols?: {
      symbol: { id: string; symbolName: string };
      isDeclared: boolean;
    }[];
    symbolicRefs?: {
      symbolicReference: { id: string; conceptUri: string };
    }[];
  },
): {
  definienda: DefiniendumInfo[];
  symbolicRefs: SymbolicRefInfo[];
} {
  const root = normalizeToRoot(statement);
  const dbDefinitionSymbols = definition.definitionSymbols ?? [];
  const dbSymbolicRefs = definition.symbolicRefs ?? [];
  
  const collected = {
    definienda: [] as { uri: string; text: string }[],
    symrefs: [] as { uri: string; text: string }[],
  };

  walk(root.content, collected);

  const definienda = collected.definienda.map((d) => {
    const match = dbDefinitionSymbols.find(
      (x) => x.symbol.symbolName === d.uri || 
             (x.symbol as any).resolvedUri === d.uri
    );

    if (!match) {
      throw new Error(
        `Definiendum "${d.uri}" exists in AST but is not linked to this definition`,
      );
    }

    return {
      ...d,
      symbolId: match.symbol.id,
    };
  });

  const symbolicRefs = collected.symrefs.map((r) => {
    const match = dbSymbolicRefs.find(
      (x) => x.symbolicReference.conceptUri === r.uri,
    );

    if (!match) {
      throw new Error(
        `SymbolicRef "${r.uri}" exists in AST but is not linked to this definition`,
      );
    }

    return {
      ...r,
      symbolicRefId: match.symbolicReference.id,
    };
  });

  return { definienda, symbolicRefs };
}