import { FtmlContent, FtmlNode, RootNode } from "@/types/ftml.types";

const INTRODUCING_NODES = new Set(["definiendum", "definame"]);

type FtmlTree = RootNode | FtmlNode | FtmlContent | FtmlContent[];

export function addSymbols(node: FtmlTree, out = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const n of node) addSymbols(n as FtmlTree, out);
    return out;
  }

  if (!node || typeof node !== "object") return out;

  const ftmlNode = node as FtmlNode & { symdecl?: boolean };

  if (INTRODUCING_NODES.has(ftmlNode.type) && typeof ftmlNode.uri === "string" && ftmlNode.uri.startsWith("LOCAL:")) {


    if (ftmlNode.symdecl === true) {
      const name = ftmlNode.uri.slice("LOCAL:".length);
      // console.log("[collectLocalSymbols] → DECLARE", name);
      out.add(name);
    } else {
      // console.log("[collectLocalSymbols] → SKIP declaration (symdecl !== true)");
    }
  }

  if (Array.isArray(ftmlNode.for_symbols)) {
    for (const u of ftmlNode.for_symbols) {
      if (typeof u === "string" && u.startsWith("LOCAL:")) {
        const name = u.slice("LOCAL:".length);
        // console.log("[collectLocalSymbols] for_symbols reference", name);
        out.add(name);
      }
    }
  }

  if (ftmlNode.content) addSymbols(ftmlNode.content, out);
  return out;
}

export function replaceUris(node: FtmlTree, map: Map<string, string>): FtmlTree {
  if (Array.isArray(node)) {
    return node.map((n) => replaceUris(n as FtmlTree, map)) as typeof node;
  }

  if (!node || typeof node !== "object") return node;

  const copy: FtmlNode = { ...(node as FtmlNode) };

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
    copy.content = replaceUris(copy.content as FtmlContent[], map) as FtmlContent[];
  }

  return copy;
}


export function removeSymdeclForFloDown(node: FtmlTree): FtmlTree {
  if (Array.isArray(node)) {
    return node.map((n) => removeSymdeclForFloDown(n as FtmlTree)) as typeof node;
  }

  if (!node || typeof node !== "object") return node;

  // Strip the non-FTML `symdecl` helper flag while keeping the node typed
  const { symdecl: _symdecl, ...rest } = node as FtmlNode & { symdecl?: boolean };
  
  if (rest.content) {
    rest.content = removeSymdeclForFloDown(rest.content as FtmlContent[]) as FtmlContent[];
  }

  return rest;
}