import { FtmlStatement } from "@/types/ftml.types";

function extractNodes(statement: FtmlStatement, type: string): any[] {
  const result: any[] = [];

  function walk(node: any) {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (typeof node !== "object") return;

    if (node.type === type) {
      result.push(node);
    }

    if (node.content) {
      walk(node.content);
    }
  }

  walk(statement);
  return result;
}

function extractDefinitionBody(latex: string): string {
  const match = latex.match(
    /\\begin\{sdefinition\}([\s\S]*?)\\end\{sdefinition\}/,
  );
  return match?.[1]?.trim() ?? "";
}

function parseLatexToFtmlContent(input: string, existing: FtmlStatement) {
  const parts: any[] = [];

  const regex = /\\(definiendum|sr)\{([^}]*)\}\{([^}]*)\}/g;

  let lastIndex = 0;
  let match;

  const existingDefMap = new Map(
    extractNodes(existing, "definiendum").map((n) => [n.uri, n]),
  );

  const existingSymMap = new Map(
    extractNodes(existing, "symref").map((n) => [n.uri, n]),
  );

  while ((match = regex.exec(input)) !== null) {
    const [full, type, label, text] = match;

    if (match.index > lastIndex) {
      parts.push(input.slice(lastIndex, match.index));
    }

    if (type === "definiendum") {
      const existingNode = existingDefMap.get(label);

      parts.push({
        type: "definiendum",
        uri: existingNode?.uri ?? label,
        content: [text],
        symdecl: existingNode?.symdecl ?? true,
      });
    }

    if (type === "sr") {
      const existingNode = existingSymMap.get(label);

      parts.push({
        type: "symref",
        uri: existingNode?.uri ?? label,
        content: [text],
      });
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < input.length) {
    parts.push(input.slice(lastIndex));
  }

  return parts;
}

export function latexToDefinitionStatement(
  latex: string,
  existing: FtmlStatement,
): FtmlStatement {
  const body = extractDefinitionBody(latex);

  const parsedContent = parseLatexToFtmlContent(body, existing);

  return {
    type: "definition",
    for_symbols:
      typeof existing === "object" && "for_symbols" in existing
        ? ((existing as any).for_symbols ?? [])
        : [],
    content: [
      {
        type: "paragraph",
        content: parsedContent,
      },
    ],
  };
}
