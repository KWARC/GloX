import {
  DefiniendumNode,
  FtmlContent,
  FtmlRoot,
  FtmlStatement,
  normalizeToRoot,
  SymrefNode,
  unwrapRoot,
} from "@/types/ftml.types";

function extractDefinitionBodyByIndex(latex: string, index: number): string {
  const regex =
    /\\begin\{sdefinition\}(\[[^\]]*\])?([\s\S]*?)\\end\{sdefinition\}/g;

  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(latex)) !== null) {
    if (i === index) {
      return match[2].trim();
    }
    i++;
  }

  return "";
}

function parseLatex(body: string, root: FtmlRoot): FtmlContent[] {
  const parts: FtmlContent[] = [];

  const { defMap, symMap } = buildExistingMaps(root);

  const regex = /\\(definiendum|sr)\{([^}]*)\}(?:\{([^}]*)\})?/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    const [full, rawType, uri, rawText] = match;

    const rawChunk = body.slice(lastIndex, match.index);

    const cleanedChunk = rawChunk
      .replace(/^[\s}]+/, "") 
      .replace(/[\s}]+$/, "") 
      .trim();

    if (cleanedChunk.length > 0) {
      parts.push(cleanedChunk);
    }

    const text = rawText ?? uri;

    if (rawType === "definiendum") {
      const existing = defMap.get(uri);

      const node: DefiniendumNode = {
        type: "definiendum",
        uri: existing?.uri ?? uri,
        content: [" " +text.trim() + " "],
        symdecl: existing?.symdecl ?? true,
      };

      parts.push(node);
    } else {
      const existing = symMap.get(uri);

      const node: SymrefNode = {
        type: "symref",
        uri: existing?.uri ?? uri,
        content: [" " +text.trim() + " "],
      };

      parts.push(node);
    }
    lastIndex = match.index + full.length;
  }

  const tail = body.slice(lastIndex);

  const cleanedTail = tail
    .replace(/^[\s}]+/, "")
    .replace(/[\s}]+$/, "")
    .trim();

  if (cleanedTail.length > 0) {
    parts.push(cleanedTail);
  }

  return parts;
}

function buildExistingMaps(root: FtmlRoot) {
  const defMap = new Map<string, any>();
  const symMap = new Map<string, any>();

  function walk(node: any) {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (typeof node !== "object") return;

    if (node.type === "definiendum") {
      defMap.set(node.uri, node);
    }

    if (node.type === "symref") {
      symMap.set(node.uri, node);
    }

    if (node.content) walk(node.content);
  }

  walk(root);

  return { defMap, symMap };
}

export function latexToDefinitionStatement(
  latex: string,
  existing: FtmlStatement,
  index: number,
): FtmlStatement {
  const body = extractDefinitionBodyByIndex(latex, index);

  const root = normalizeToRoot(existing as FtmlRoot);

  const content = parseLatex(body, root);

  return unwrapRoot({
    ...root,
    content: [
      {
        type: "definition",
        ...(typeof root.content[0] === "object" &&
        "for_symbols" in root.content[0]
          ? { for_symbols: (root.content[0] as any).for_symbols ?? [] }
          : {}),
        content: [
          {
            type: "paragraph",
            content,
          },
        ],
      },
    ],
  });
}
