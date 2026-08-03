import {
  DefinitionNode,
  FloDownStatement,
  isDefiniendumNode,
  PersistedBlock,
  RootNode,
} from "@/types/floDown.types";
import {
  attachForSymbolsToDefinition,
  buildForSymbols,
} from "@/server/ftml/declaredSymbols";
import { mapInlines } from "@/server/ftml/statementContent";

type FloDownInstance = {
  addSymbolDeclaration: (symbol: string) => string;
};

function isMathHubUri(uri: string): boolean {
  try {
    new URL(uri);
    return true;
  } catch {
    return false;
  }
}

function transformBlock(
  block: PersistedBlock,
  symbolMap: Map<string, string>,
  statementForSymbols: FloDownStatement,
  declaredSymbols: readonly string[],
): PersistedBlock {
  if (block.type === "paragraph") {
    return block;
  }

  const def = block as DefinitionNode;
  const withSymbols = attachForSymbolsToDefinition(
    def,
    statementForSymbols,
    symbolMap,
    declaredSymbols,
  );

  return {
    ...withSymbols,
    content: def.content.map((inner) => {
      if (inner.type !== "paragraph") return inner;
      return {
        ...inner,
        content: mapInlines(inner.content, (item) => {
          if (typeof item === "string") return item;
          if (symbolMap && isDefiniendumNode(item)) {
            return {
              ...item,
              uri: symbolMap.get(item.uri) ?? item.uri,
            };
          }
          return item;
        }),
      };
    }),
  };
}

export function finalFloDown(
  ast: FloDownStatement,
  fd: FloDownInstance,
  declaredSymbols: readonly string[] = [],
): FloDownStatement {
  const clone: FloDownStatement = structuredClone(ast);
  const statementForSymbols = clone;
  const symbolMap = new Map<string, string>();

  for (const symbol of declaredSymbols) {
    if (isMathHubUri(symbol)) continue;
    symbolMap.set(symbol, fd.addSymbolDeclaration(symbol));
  }

  function transformRoot(root: RootNode): RootNode {
    return {
      ...root,
      content: root.content.map((block) =>
        transformBlock(block, symbolMap, statementForSymbols, declaredSymbols),
      ),
    };
  }

  if (Array.isArray(clone)) {
    return clone.map((block) =>
      transformBlock(block, symbolMap, statementForSymbols, declaredSymbols),
    );
  }

  if (clone.type === "root") {
    return transformRoot(clone);
  }

  return transformBlock(
    clone,
    symbolMap,
    statementForSymbols,
    declaredSymbols,
  );
}

export { buildForSymbols };
