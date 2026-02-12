import { initFloDown } from "@/lib/flodownClient";
import {
  FtmlStatement,
  normalizeToRoot,
  DefinitionNode,
  FtmlContent,
  FtmlNode,
} from "@/types/ftml.types";

function finalFTML(
  node: FtmlNode,
  uriMap: Map<string, string>,
): FtmlNode {
  if (node.type === "definition") {
    const def = node as DefinitionNode;

    return {
      ...def,
      for_symbols: def.for_symbols.map(
        (s) => uriMap.get(s) ?? s,
      ),
      content: rewriteContent(def.content, uriMap),
    };
  }

  if (node.type === "definiendum" || node.type === "symref") {
    return {
      ...node,
      uri: uriMap.get(node.uri!) ?? node.uri,
      content: rewriteContent(node.content ?? [], uriMap),
    };
  }

  if (node.content) {
    return {
      ...node,
      content: rewriteContent(node.content, uriMap),
    };
  }

  return node;
}

function rewriteContent(
  content: FtmlContent[],
  uriMap: Map<string, string>,
): FtmlContent[] {
  return content.map((item) => {
    if (typeof item === "string") return item;
    return finalFTML(item, uriMap);
  });
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

    const def = block as DefinitionNode;
    const uriMap = new Map<string, string>();

    for (const symbolName of def.for_symbols) {
      if (!symbolName.startsWith("http")) {
        const declaredUri =
          fd.addSymbolDeclaration(symbolName);
        uriMap.set(symbolName, declaredUri);
      }
    }

    const ftmlEle = finalFTML(block, uriMap);
    fd.addElement(ftmlEle);
  }

  return fd.getStex();
}