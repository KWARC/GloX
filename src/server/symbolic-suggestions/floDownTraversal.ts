import type { SuggestedReference } from "./types";

export {
  extractPlainText,
  getStringContent,
  isDeclaredDefiniendum,
  walkEditableTextNodes,
} from "@/server/ftml/statementContent";

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
