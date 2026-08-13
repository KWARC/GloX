import {
  FloDownContent,
  FloDownStatement,
  hasInlineChildren,
  isDefiniendumNode,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/floDown.types";
import {
  getInlineContent,
  mapInlineContent,
  walkInlines,
} from "@/server/ftml/statementContent";

export function getDeclaredSymbolUris(
  statement: FloDownStatement,
  declaredSymbols?: readonly string[],
): Set<string> {
  if (declaredSymbols && declaredSymbols.length > 0) {
    return new Set(declaredSymbols);
  }

  const declared = new Set<string>();
  const root = normalizeToRoot(statement);

  for (const block of root.content) {
    walkInlines(getInlineContent(block), (item) => {
      if (isDefiniendumNode(item) && item.symdecl === true && item.uri.trim()) {
        declared.add(item.uri);
      }
    });
  }

  return declared;
}

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
  const root = normalizeToRoot(statement);

  for (const block of root.content) {
    walkInlines(getInlineContent(block), (item) => {
      if (typeof item === "string") return;
      if (item.type === "symref" && item.uri && symbolUris.has(item.uri)) {
        count += 1;
      }
    });
  }

  return count;
}

export function removeSymbolReferences(
  statement: FloDownStatement,
  symbolUris: ReadonlySet<string>,
): { statement: FloDownStatement; removedCount: number } {
  let removedCount = 0;
  const root = normalizeToRoot(structuredClone(statement));

  root.content = root.content.map((block) =>
    mapInlineContent(block, (content) => {
      const result: FloDownContent[] = [];

      for (const item of content) {
        if (typeof item === "string") {
          appendContent(result, item);
          continue;
        }

        if (item.type === "symref" && item.uri && symbolUris.has(item.uri)) {
          removedCount += 1;
          for (const unwrapped of unwrapSymrefContent(item.content ?? [])) {
            appendContent(result, unwrapped);
          }
          continue;
        }

        if (hasInlineChildren(item)) {
          for (const unwrapped of unwrapSymrefContent(item.content)) {
            appendContent(result, unwrapped);
          }
          continue;
        }

        appendContent(result, item);
      }

      return result;
    }),
  );

  return {
    statement: unwrapRoot(root),
    removedCount,
  };
}

function unwrapSymrefContent(content: FloDownContent[]): FloDownContent[] {
  const result: FloDownContent[] = [];
  for (const item of content) {
    if (typeof item === "string") {
      appendContent(result, item);
      continue;
    }
    if (hasInlineChildren(item)) {
      for (const unwrapped of unwrapSymrefContent(item.content)) {
        appendContent(result, unwrapped);
      }
      continue;
    }
    appendContent(result, item);
  }
  return result;
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
