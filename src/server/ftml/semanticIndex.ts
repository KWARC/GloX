export type DefiniendumInfo = {
  uri: string;
  text: string;
};

export type SymbolicRefInfo = {
  uri: string;
  text: string;
};

export type SemanticIndex = {
  definienda: DefiniendumInfo[];
  symbolicRefs: SymbolicRefInfo[];
};

export function extractSemanticIndex(ast: any): SemanticIndex {
  const index: SemanticIndex = {
    definienda: [],
    symbolicRefs: [],
  };

  function walk(node: any) {
    if (node == null) return;

    // TEXT NODE
    if (typeof node === "string") return;

    // DEFINIENDUM
    if (node.type === "definiendum") {
      index.definienda.push({
        uri: node.uri,
        text: Array.isArray(node.content) ? node.content.join("") : "",
      });
    }

    // SYMBOLIC REF
    if (node.type === "symref") {
      index.symbolicRefs.push({
        uri: node.uri,
        text: Array.isArray(node.content) ? node.content.join("") : "",
      });
    }

    // WALK CONTENT
    if (Array.isArray(node.content)) {
      node.content.forEach(walk);
    }
  }

  walk(ast);
  return index;
}
