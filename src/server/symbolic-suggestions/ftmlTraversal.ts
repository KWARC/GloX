import type { FtmlContent, FtmlNode, FtmlStatement } from "@/types/ftml.types";
import { normalizeToRoot } from "@/types/ftml.types";
import type { SuggestedReference } from "./types";

const SEMANTIC_TYPES = new Set(["symref", "definiendum", "definiens"]);
export function getStringContent(content: FtmlContent[] | undefined): string {
  return (content ?? [])
    .map((c) => (typeof c === "string" ? c : getStringContent(c.content)))
    .join("");
}

function walkPlainText(node: FtmlNode): string {
  return (node.content ?? [])
    .map((c) => (typeof c === "string" ? c : walkPlainText(c)))
    .join("");
}

export function extractPlainText(statement: FtmlStatement): string {
  const root = normalizeToRoot(statement);
  return walkPlainText(root);
}

export function walkTextNodes(
  node: FtmlNode,
  visit: (text: string, plainOffset: number, nodePath: number[]) => void,
  insideSemantic = false,
  plainOffset = 0,
  path: number[] = [],
): number {
  let cursor = plainOffset;
  const nextInsideSemantic = insideSemantic || SEMANTIC_TYPES.has(node.type);

  const content = node.content ?? [];
  for (let i = 0; i < content.length; i++) {
    const child = content[i];
    const childPath = [...path, i];

    if (typeof child === "string") {
      if (!nextInsideSemantic) visit(child, cursor, childPath);
      cursor += child.length;
    } else {
      cursor = walkTextNodes(
        child,
        visit,
        nextInsideSemantic,
        cursor,
        childPath,
      );
    }
  }

  return cursor;
}

export function isDeclaredDefiniendum(
  node: FtmlNode,
): node is FtmlNode & { type: "definiendum"; symdecl: true; uri: string } {
  const candidate = node as FtmlNode & { symdecl?: unknown };
  return (
    candidate.type === "definiendum" &&
    candidate.symdecl === true &&
    !!candidate.uri
  );
}

export function walkNodes(node: FtmlNode, visit: (node: FtmlNode) => void) {
  visit(node);

  for (const child of node.content ?? []) {
    if (typeof child !== "string") walkNodes(child, visit);
  }
}

export function resolveConflicts(input: SuggestedReference[]): SuggestedReference[] {
  return [...input]
    .sort((a, b) => {
      if (a.plainStartOffset !== b.plainStartOffset) {
        return a.plainStartOffset - b.plainStartOffset;
      }
      return (
        b.plainEndOffset -
        b.plainStartOffset -
        (a.plainEndOffset - a.plainStartOffset)
      );
    })
    .reduce<SuggestedReference[]>((acc, cur) => {
      const overlap = acc.some(
        (e) =>
          cur.plainStartOffset < e.plainEndOffset &&
          e.plainStartOffset < cur.plainEndOffset,
      );
      if (!overlap) acc.push(cur);
      return acc;
    }, []);
}

export function buildContext(text: string, start: number, end: number) {
  const w = 80;
  return text.slice(Math.max(0, start - w), Math.min(text.length, end + w));
}
