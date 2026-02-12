import {
    DefiniendumNode,
    DefinitionNode,
    FtmlContent,
    FtmlRoot
} from "@/types/ftml.types";

type FloDownInstance = {
  addSymbolDeclaration: (symbol: string) => string;
};

export function finalFloDown(
  ast: FtmlRoot,
  fd: FloDownInstance,
): FtmlRoot {
  const clone = structuredClone(ast);

  function transformNode(node: any): any {
    if (Array.isArray(node)) {
      return node.map(transformNode);
    }

    if (!node || typeof node !== "object") {
      return node;
    }

    if (node.type === "definition") {
      return transformDefinition(node as DefinitionNode);
    }

    if (node.content) {
      return {
        ...node,
        content: transformNode(node.content),
      };
    }

    return node;
  }

  function transformDefinition(def: DefinitionNode): DefinitionNode {
    const symbolMap = new Map<string, string>();

    const declaredSymbols = def.for_symbols ?? [];

    // 1. Create runtime declarations
    for (const symbol of declaredSymbols) {
      if (isMathHubUri(symbol)) continue;

      const runtimeUri = fd.addSymbolDeclaration(symbol);
      symbolMap.set(symbol, runtimeUri);
    }

    // 2. Rewrite content
    const rewrittenContent = rewriteContent(def.content, symbolMap);

    return {
      ...def,
      for_symbols: declaredSymbols.map((s) =>
        symbolMap.get(s) ?? s,
      ),
      content: rewrittenContent,
    };
  }

  function rewriteContent(
    content: FtmlContent[] | undefined,
    symbolMap: Map<string, string>,
  ): FtmlContent[] {
    if (!content) return [];

    return content.map((item) => {
      if (typeof item === "string") return item;

      if (item.type === "definiendum") {
        const uri = symbolMap.get(item.uri!) ?? item.uri;

        return {
          ...item,
          uri,
        } as DefiniendumNode;
      }

      if (item.content) {
        return {
          ...item,
          content: rewriteContent(item.content, symbolMap),
        };
      }

      return item;
    });
  }

  function isMathHubUri(uri: string): boolean {
    try {
      new URL(uri);
      return true;
    } catch {
      return false;
    }
  }

  return transformNode(clone);
}