import {
  DefinitionNode,
  FloDownContent,
  FloDownStatement,
  Inline,
  InlineInDefinition,
  isDefiniendumNode,
  isDefinitionNode,
  normalizeToRoot,
  PersistedBlock,
  unwrapRoot,
} from "@/types/floDown.types";
import {
  collectDefiniendumUris as collectDefiniendumUrisFromContent,
  mapInlines,
} from "@/server/ftml/statementContent";

/** All definiendum URIs in statement content (deduped, stable order). */
export function collectDefiniendumUris(statement: FloDownStatement): string[] {
  return collectDefiniendumUrisFromContent(statement);
}

function stripInlinesForPersist(content: FloDownContent[]): FloDownContent[] {
  return mapInlines(content, (item) => {
    if (typeof item === "string") return item;
    if (isDefiniendumNode(item)) {
      const { symdecl: _symdecl, ...rest } = item;
      return rest;
    }
    return item;
  });
}

function stripBlockForPersist(block: PersistedBlock): PersistedBlock {
  if (isDefinitionNode(block)) {
    return {
      ...block,
      for_symbols: [],
      content: block.content.map((inner) => {
        if (inner.type !== "paragraph") return inner;
        return {
          ...inner,
          content: stripInlinesForPersist(inner.content) as InlineInDefinition[],
        };
      }),
    };
  }

  return {
    ...block,
    content: stripInlinesForPersist(block.content) as Inline[],
  };
}

/** Remove persisted-only fields: symdecl on definienda; reset unused `for_symbols`. */
export function sanitizeStatementForPersist(
  statement: FloDownStatement,
): FloDownStatement {
  const root = normalizeToRoot(statement);
  const stripped = {
    ...root,
    content: root.content.map((block) => stripBlockForPersist(block)),
  };
  return unwrapRoot(stripped);
}

/** Build `for_symbols` for export: definienda ∩ declaredSymbols, mapped via uriMap. */
export function buildForSymbols(
  statement: FloDownStatement,
  uriMap: Map<string, string>,
  declaredSymbols: readonly string[] = [],
): string[] {
  const declared = new Set(declaredSymbols);
  return collectDefiniendumUris(statement)
    .filter((uri) => declared.has(uri))
    .map((uri) => uriMap.get(uri) ?? uri);
}

export function attachForSymbolsToDefinition(
  definition: DefinitionNode,
  statement: FloDownStatement,
  uriMap: Map<string, string>,
  declaredSymbols: readonly string[] = [],
): DefinitionNode {
  return {
    ...definition,
    for_symbols: buildForSymbols(statement, uriMap, declaredSymbols),
  };
}

export function isDeclaredOnRow(
  declaredSymbols: readonly string[],
  uri: string,
): boolean {
  return declaredSymbols.includes(uri);
}

/** Top-level blocks from a statement (handles root/array/single). */
export function getTopLevelBlocks(statement: FloDownStatement): PersistedBlock[] {
  return normalizeToRoot(statement).content;
}
