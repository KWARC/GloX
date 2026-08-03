import {
  DefinitionNode,
  FtmlContent,
  FtmlNode,
  FtmlRoot,
  isDefiniendumNode,
  isDefinitionNode,
  RootNode,
} from "@/types/ftml.types";
import {
  attachForSymbolsToDefinition,
  buildForSymbols,
} from "@/server/ftml/declaredSymbols";

type FloDownInstance = {
  addSymbolDeclaration: (symbol: string) => string;
};

export function finalFloDown(
  ast: FtmlRoot,
  fd: FloDownInstance,
  declaredSymbols: readonly string[] = [],
): FtmlRoot {
  const clone: FtmlRoot = structuredClone(ast);
  const statementForSymbols = clone;

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

    for (const symbol of declaredSymbols) {
      if (isMathHubUri(symbol)) continue;

      const runtimeUri = fd.addSymbolDeclaration(symbol);
      symbolMap.set(symbol, runtimeUri);
    }

    const withSymbols = attachForSymbolsToDefinition(
      def,
      statementForSymbols,
      symbolMap,
    );

    return {
      ...withSymbols,
      content: transformContent(withSymbols.content, symbolMap),
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

export { buildForSymbols };
