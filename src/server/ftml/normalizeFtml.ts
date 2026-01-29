const INTRODUCING_NODES = new Set(["definiendum", "definame"]);

export function collectLocalSymbols(
  node: any,
  out = new Set<string>(),
): Set<string> {
  if (Array.isArray(node)) {
    for (const n of node) collectLocalSymbols(n, out);
    return out;
  }

  if (!node || typeof node !== "object") return out;

  // 🔑 collect symbols introduced by definiendum / defininame
  if (
    INTRODUCING_NODES.has(node.type) &&
    typeof node.uri === "string" &&
    node.uri.startsWith("LOCAL:")
  ) {
    out.add(node.uri.slice("LOCAL:".length));
  }

  // 🔑 also collect symbols used in definition headers
  if (Array.isArray(node.for_symbols)) {
    for (const u of node.for_symbols) {
      if (typeof u === "string" && u.startsWith("LOCAL:")) {
        out.add(u.slice("LOCAL:".length));
      }
    }
  }

  if (node.content) collectLocalSymbols(node.content, out);
  return out;
}

export function replaceLocalUris(node: any, map: Map<string, string>): any {
  if (Array.isArray(node)) {
    return node.map((n) => replaceLocalUris(n, map));
  }

  if (!node || typeof node !== "object") return node;

  const copy = { ...node };

  if (typeof copy.uri === "string" && copy.uri.startsWith("LOCAL:")) {
    const name = copy.uri.slice("LOCAL:".length);
    copy.uri = map.get(name) ?? copy.uri;
  }

  if (Array.isArray(copy.for_symbols)) {
    copy.for_symbols = copy.for_symbols.map((u: string) =>
      u.startsWith("LOCAL:") ? (map.get(u.slice("LOCAL:".length)) ?? u) : u,
    );
  }

  if (copy.content) {
    copy.content = replaceLocalUris(copy.content, map);
  }

  return copy;
}
