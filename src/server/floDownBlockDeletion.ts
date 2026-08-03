import {
  FloDownContent,
  FloDownNode,
  FloDownStatement,
  isDefiniendumNode,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/floDown.types";

export function getDeclaredSymbolUris(
  statement: FloDownStatement,
  declaredSymbols?: readonly string[],
): Set<string> {
  if (declaredSymbols && declaredSymbols.length > 0) {
    return new Set(declaredSymbols);
  }

  const declared = new Set<string>();
  const stack: FloDownContent[] = [...normalizeToRoot(statement).content];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node === "string") continue;

    if (isDefiniendumNode(node) && node.symdecl === true && node.uri.trim()) {
      declared.add(node.uri);
    }

    if (node.content?.length) {
      stack.push(...node.content);
    }
  }

  return declared;
}

/** Symbol names this row declares (DB column, with legacy symdecl fallback). */
export function resolveDeclaredSymbolNames(
  statement: FloDownStatement,
  declaredSymbols?: readonly string[],
): string[] {
  return Array.from(getDeclaredSymbolUris(statement, declaredSymbols));
}

export function countSymbolReferences(
  statement: FloDownStatement,
  symbolUris: ReadonlySet<string>,
): number {
  let count = 0;
  const stack: FloDownContent[] = [...normalizeToRoot(statement).content];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node === "string") continue;

    if (node.type === "symref" && node.uri && symbolUris.has(node.uri)) {
      count += 1;
    }

    if (node.content?.length) {
      stack.push(...node.content);
    }
  }

  return count;
}

export function removeSymbolReferences(
  statement: FloDownStatement,
  symbolUris: ReadonlySet<string>,
): { statement: FloDownStatement; removedCount: number } {
  let removedCount = 0;

  function visitContent(content: FloDownContent[]): FloDownContent[] {
    const result: FloDownContent[] = [];

    for (const item of content) {
      if (typeof item === "string") {
        appendContent(result, item);
        continue;
      }

      if (item.type === "symref" && item.uri && symbolUris.has(item.uri)) {
        removedCount += 1;
        for (const child of visitContent(item.content ?? [])) {
          appendContent(result, child);
        }
        continue;
      }

      const copy: FloDownNode = { ...item };
      if (item.content) {
        copy.content = visitContent(item.content);
      }
      appendContent(result, copy);
    }

    return result;
  }

  const root = normalizeToRoot(structuredClone(statement));
  root.content = visitContent(root.content) as FloDownNode[];

  return {
    statement: unwrapRoot(root),
    removedCount,
  };
}

function appendContent(result: FloDownContent[], item: FloDownContent) {
  if (item === "") return;

  if (
    typeof item === "string" &&
    typeof result[result.length - 1] === "string"
  ) {
    result[result.length - 1] = `${result[result.length - 1]}${item}`;
    return;
  }

  result.push(item);
}
