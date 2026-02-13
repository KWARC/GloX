import {
  DefinitionNode,
  FtmlContent,
  FtmlNode,
  FtmlRoot,
  isDefiniendumNode,
  isDefinitionNode,
  RootNode,
} from "@/types/ftml.types";

type FloDownInstance = {
  addSymbolDeclaration: (symbol: string) => string;
};

export function finalFloDown(ast: FtmlRoot, fd: FloDownInstance): FtmlRoot {
  const clone: FtmlRoot = structuredClone(ast);

  function transformNode(node: FtmlNode): FtmlNode {
    if (isDefinitionNode(node)) {
      return transformDefinition(node);
    }

    if (!node.content) return node;

    return {
      ...node,
      content: transformContent(node.content),
    };
  }

  function transformDefinition(def: DefinitionNode): DefinitionNode {
    const symbolMap = new Map<string, string>();

    const declaredSymbols = def.for_symbols ?? [];

    for (const symbol of declaredSymbols) {
      if (isMathHubUri(symbol)) continue;

      const runtimeUri = fd.addSymbolDeclaration(symbol);
      symbolMap.set(symbol, runtimeUri);
    }

    return {
      ...def,
      for_symbols: declaredSymbols.map((s) => symbolMap.get(s) ?? s),
      content: transformContent(def.content, symbolMap),
    };
  }

  function transformContent(
    content: FtmlContent[],
    symbolMap?: Map<string, string>,
  ): FtmlContent[] {
    return content.map((item) => {
      if (typeof item === "string") return item;

      if (symbolMap && isDefiniendumNode(item)) {
        return {
          ...item,
          uri: symbolMap.get(item.uri) ?? item.uri,
        };
      }

      if (item.content) {
        return {
          ...item,
          content: transformContent(item.content, symbolMap),
        };
      }

      return item;
    });
  }

  function transformRoot(root: RootNode): RootNode {
    return {
      ...root,
      content: root.content.map(transformNode),
    };
  }

  function isMathHubUri(uri: string): boolean {
    try {
      new URL(uri);
      return true;
    } catch {
      return false;
    }
  }

  if (Array.isArray(clone)) {
    return clone.map((n) => transformNode(n));
  }

  if (clone.type === "root") {
    return transformRoot(clone as RootNode);
  }

  return transformNode(clone);
}
