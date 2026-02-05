const INTRODUCING_NODES = new Set(["definiendum", "definame"]);

export function addSymbols(
  node: any,
  out = new Set<string>(),
): Set<string> {
  if (Array.isArray(node)) {
    for (const n of node) addSymbols(n, out);
    return out;
  }

  if (!node || typeof node !== "object") return out;

  if (
    INTRODUCING_NODES.has(node.type) &&
    typeof node.uri === "string" &&
    node.uri.startsWith("LOCAL:")
  ) {


    if (node.symdecl === true) {
      const name = node.uri.slice("LOCAL:".length);
      // console.log("[collectLocalSymbols] → DECLARE", name);
      out.add(name);
    } else {
      // console.log("[collectLocalSymbols] → SKIP declaration (symdecl !== true)");
    }
  }

  if (Array.isArray(node.for_symbols)) {
    for (const u of node.for_symbols) {
      if (typeof u === "string" && u.startsWith("LOCAL:")) {
        const name = u.slice("LOCAL:".length);
        // console.log("[collectLocalSymbols] for_symbols reference", name);
        out.add(name);
      }
    }
  }

  if (node.content) addSymbols(node.content, out);
  return out;
}

export function replaceUris(node: any, map: Map<string, string>): any {
  if (Array.isArray(node)) {
    return node.map((n) => replaceUris(n, map));
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
    copy.content = replaceUris(copy.content, map);
  }

  return copy;
}


export function removeSymdeclForFloDown(node: any): any {
  if (Array.isArray(node)) {
    return node.map(n => removeSymdeclForFloDown(n));
  }

  if (!node || typeof node !== "object") return node;

  const { symdecl, ...rest } = node;
  
  if (rest.content) {
    rest.content = removeSymdeclForFloDown(rest.content);
  }

  return rest;
}