import {
  DefinitionNode,
  FloDownContent,
  FloDownNode,
  FloDownStatement,
  isDefiniendumNode,
  isDefinitionNode,
  isNode,
  isRootNode,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/floDown.types";

function walkContent(content: FloDownContent[], visit: (node: FloDownNode) => void) {
  for (const item of content) {
    if (typeof item === "string") continue;
    visit(item);
    if (item.content?.length) {
      walkContent(item.content, visit);
    }
  }
}

function walkStatement(statement: FloDownStatement, visit: (node: FloDownNode) => void) {
  const root = normalizeToRoot(statement);
  for (const block of root.content) {
    if (!isNode(block)) continue;
    visit(block);
    if (block.content?.length) {
      walkContent(block.content, visit);
    }
  }
}

/** All definiendum URIs in statement content (deduped, stable order). */
export function collectDefiniendumUris(statement: FloDownStatement): string[] {
  const uris: string[] = [];
  const seen = new Set<string>();

  walkStatement(statement, (node) => {
    if (!isDefiniendumNode(node)) return;
    const uri = node.uri?.trim();
    if (!uri || seen.has(uri)) return;
    seen.add(uri);
    uris.push(uri);
  });

  return uris;
}

function stripNodeForPersist(node: FloDownNode): FloDownNode {
  if (isDefinitionNode(node)) {
    const { for_symbols: _forSymbols, ...rest } = node;
    return {
      ...rest,
      content: stripContentForPersist(node.content ?? []),
    } as DefinitionNode;
  }

  if (isDefiniendumNode(node)) {
    const { symdecl: _symdecl, ...rest } = node;
    return {
      ...rest,
      content: stripContentForPersist(node.content ?? []),
    };
  }

  if (!node.content) return node;

  return {
    ...node,
    content: stripContentForPersist(node.content),
  };
}

function stripContentForPersist(content: FloDownContent[]): FloDownContent[] {
  return content.map((item) => {
    if (typeof item === "string") return item;
    return stripNodeForPersist(item);
  });
}

/** Remove persisted-only fields: symdecl, for_symbols. */
export function sanitizeStatementForPersist(
  statement: FloDownStatement,
): FloDownStatement {
  const root = normalizeToRoot(statement);
  const stripped = {
    ...root,
    content: root.content.map((node) =>
      isNode(node) ? stripNodeForPersist(node) : node,
    ),
  };
  return unwrapRoot(stripped);
}

/** Build ephemeral for_symbols for export from definienda + URI map. */
export function buildForSymbols(
  statement: FloDownStatement,
  uriMap: Map<string, string>,
): string[] {
  return collectDefiniendumUris(statement).map((uri) => uriMap.get(uri) ?? uri);
}

export function attachForSymbolsToDefinition(
  definition: DefinitionNode,
  statement: FloDownStatement,
  uriMap: Map<string, string>,
): DefinitionNode {
  return {
    ...definition,
    for_symbols: buildForSymbols(statement, uriMap),
  };
}

export function isDeclaredOnRow(
  declaredSymbols: readonly string[],
  uri: string,
): boolean {
  return declaredSymbols.includes(uri);
}

/** Top-level blocks from a statement (handles root/array/single). */
export function getTopLevelBlocks(statement: FloDownStatement): FloDownNode[] {
  if (Array.isArray(statement)) {
    return statement.filter(isNode);
  }
  if (isRootNode(statement)) {
    return statement.content.filter(isNode);
  }
  if (isNode(statement)) {
    return [statement];
  }
  return [];
}
