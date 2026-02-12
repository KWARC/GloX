import { initFloDown } from "@/lib/flodownClient";
import {
  FtmlStatement,
  normalizeToRoot,
  FtmlNode,
} from "@/types/ftml.types";

function rewriteUris(
  node: unknown,
  uriMap: Map<string, string>,
): unknown {
  if (Array.isArray(node)) {
    return node.map((n) => rewriteUris(n, uriMap));
  }

  if (!node || typeof node !== "object") return node;

  const current = node as FtmlNode;

  if (
    (current.type === "definiendum" ||
      current.type === "symref") &&
    current.uri
  ) {
    return {
      ...current,
      uri: uriMap.get(current.uri) ?? current.uri,
      content: rewriteUris(current.content, uriMap),
    };
  }

  if (current.type === "definition") {
    return {
      ...current,
      for_symbols: current.for_symbols?.map(
        (s) => uriMap.get(s) ?? s,
      ),
      content: rewriteUris(current.content, uriMap),
    };
  }

  if (current.content) {
    return {
      ...current,
      content: rewriteUris(current.content, uriMap),
    };
  }

  return current;
}

export async function generateStexFromFtml(
  ftmlAst: FtmlStatement,
): Promise<string> {
  const floDown = await initFloDown();
  floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

  const fd = floDown.FloDown.fromUri(
    "http://temp?a=temp&d=temp&l=en",
  );

  const root = normalizeToRoot(ftmlAst);

  for (const block of root.content) {
    if (block.type === "paragraph") {
      fd.addElement(block);
      continue;
    }

    if (block.type !== "definition") continue;

    const uriMap = new Map<string, string>();

    if (Array.isArray(block.for_symbols)) {
      for (const symbolName of block.for_symbols) {
        if (!symbolName.startsWith("http")) {
          const declaredUri =
            fd.addSymbolDeclaration(symbolName);
          uriMap.set(symbolName, declaredUri);
        }
      }
    }

    const rewritten = rewriteUris(block, uriMap);
    fd.addElement(rewritten);
  }

  return fd.getStex();
}