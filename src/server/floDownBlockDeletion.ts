import {
  FtmlContent,
  FtmlNode,
  FtmlStatement,
  isDefiniendumNode,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/ftml.types";

export function getDeclaredSymbolUris(statement: FtmlStatement): Set<string> {
  const declared = new Set<string>();
  const stack: FtmlContent[] = [...normalizeToRoot(statement).content];

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

export function countSymbolReferences(
  statement: FtmlStatement,
  symbolUris: ReadonlySet<string>,
): number {
  let count = 0;
  const stack: FtmlContent[] = [...normalizeToRoot(statement).content];

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
  statement: FtmlStatement,
  symbolUris: ReadonlySet<string>,
): { statement: FtmlStatement; removedCount: number } {
  let removedCount = 0;

  function visitContent(content: FtmlContent[]): FtmlContent[] {
    const result: FtmlContent[] = [];

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

      const copy: FtmlNode = { ...item };
      if (item.content) {
        copy.content = visitContent(item.content);
      }
      appendContent(result, copy);
    }

    return result;
  }

  const root = normalizeToRoot(structuredClone(statement));
  root.content = visitContent(root.content) as FtmlNode[];

  return {
    statement: unwrapRoot(root),
    removedCount,
  };
}

function appendContent(result: FtmlContent[], item: FtmlContent) {
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
