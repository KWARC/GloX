import { FtmlStatement } from "@/types/ftml.types";

function extractDefinitionBody(latex: string): string {
  const match = latex.match(
    /\\begin\{sdefinition\}([\s\S]*?)\\end\{sdefinition\}/,
  );
  return match?.[1]?.trim() ?? "";
}

function extractExistingSymrefs(statement: FtmlStatement): any[] {
  const result: any[] = [];

  function walk(node: any) {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (typeof node !== "object") return;

    if (node.type === "symref") {
      result.push(node);
    }

    if (node.content) {
      walk(node.content);
    }
  }

  walk(statement);
  return result;
}

function parseLatexToFtmlContent(input: string, existingSymrefs: any[]) {
  const parts: any[] = [];
  const regex = /\\sr\{([^}]+)\}\{([^}]+)\}/g;

  let lastIndex = 0;
  let match;
  let symIndex = 0;

  while ((match = regex.exec(input)) !== null) {
    const [full, _label, text] = match;

    if (match.index > lastIndex) {
      parts.push(input.slice(lastIndex, match.index));
    }

    const existing = existingSymrefs[symIndex];

    parts.push({
      type: "symref",
      uri: existing?.uri,
      content: [text],
    });

    symIndex++;
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

  const existingSymrefs = extractExistingSymrefs(existing);

  const parsedContent = parseLatexToFtmlContent(body, existingSymrefs);

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
