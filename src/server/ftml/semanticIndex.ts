export type DefiniendumInfo = {
  uri: string;
  text: string;
  definiendumId: string;
};

export type SymbolicRefInfo = {
  uri: string;
  text: string;
  symbolicRefId: string;
};

type AstNode = string | { type?: string; uri?: string; content?: AstNode[] };

function walkAst(
  node: AstNode,
  acc: {
    definienda: { uri: string; text: string }[];
    symbolicRefs: { uri: string; text: string }[];
  },
) {
  if (typeof node === "string") return;
  if (!node || typeof node !== "object") return;

  if (node.type === "definiendum" && node.uri && node.content) {
    acc.definienda.push({ uri: node.uri, text: node.content.join("") });
  }
  if (node.type === "symref" && node.uri && node.content) {
    acc.symbolicRefs.push({ uri: node.uri, text: node.content.join("") });
  }

  if (Array.isArray(node.content)) {
    node.content.forEach((child) => walkAst(child, acc));
  }
}

export function extractSemanticIndex(
  statement: any,
  definition: {
    definienda?: { definiendum: { id: string; symbolName: string } }[];
    symbolicRefs?: { symbolicReference: { id: string; conceptUri: string } }[];
  },
): {
  definienda: DefiniendumInfo[];
  symbolicRefs: SymbolicRefInfo[];
} {
  const collected = {
    definienda: [] as { uri: string; text: string }[],
    symbolicRefs: [] as { uri: string; text: string }[],
  };

  walkAst(statement, collected);

  const definienda: DefiniendumInfo[] = collected.definienda.map((d) => {
    const match = definition.definienda?.find(
      (x) => `LOCAL:${x.definiendum.symbolName}` === d.uri,
    );
    if (!match) throw new Error(`Definiendum DB row not found for ${d.uri}`);
    return { ...d, definiendumId: match.definiendum.id };
  });

  const symbolicRefs: SymbolicRefInfo[] = collected.symbolicRefs.map((r) => {
    const match = definition.symbolicRefs?.find(
      (x) => x.symbolicReference.conceptUri === r.uri,
    );
    if (!match) throw new Error(`SymbolicRef DB row not found for ${r.uri}`);
    return { ...r, symbolicRefId: match.symbolicReference.id };
  });

  return { definienda, symbolicRefs };
}
