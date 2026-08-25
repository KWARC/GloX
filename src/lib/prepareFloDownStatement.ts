/// <reference path="../../public/flodown/flodown.d.ts" />

const HEADING_LEVEL_NAMES = [
  "Section",
  "SubSection",
  "SubSubSection",
  "Paragraph",
  "SubParagraph",
] as const;

function collectDefiniendumUris(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectDefiniendumUris(item, found);
    }
    return found;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (record.type === "definiendum" && typeof record.uri === "string") {
      if (!found.includes(record.uri)) found.push(record.uri);
    }
    for (const child of Object.values(record)) {
      collectDefiniendumUris(child, found);
    }
  }
  return found;
}

function rewriteNode(value: unknown, inDefinition: boolean): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteNode(item, inDefinition));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const nextInDefinition = record.type === "definition" ? true : inDefinition;
  const next: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(record)) {
    if (key === "symdecl") {
      continue;
    }

    if (key === "level" && record.type === "heading" && typeof child === "number") {
      next.level = HEADING_LEVEL_NAMES[child] ?? "Section";
      continue;
    }

    next[key] = rewriteNode(child, nextInDefinition);
  }

  if (
    next.type === "definiendum" &&
    !inDefinition &&
    typeof next.uri === "string"
  ) {
    return { type: "symref", uri: next.uri, content: next.content ?? [] };
  }

  if (next.type === "definition") {
    const existing = Array.isArray(next.for_symbols)
      ? (next.for_symbols as unknown[])
      : [];
    const fromDefinienda = collectDefiniendumUris(next.content);
    // FloDown for_symbols = symbols this definition is **for** (may be imported). Not declaredSymbols.
    next.for_symbols = existing.length > 0 ? existing : fromDefinienda;
  }

  return next;
}

/** Clone GloX persisted JSON into FloDown-valid blocks. Does not write the DB (D-FTML-01). */
export function rewriteStatementForFloDown(statement: unknown): unknown {
  return rewriteNode(structuredClone(statement), false);
}

export type FloDownMountBlock = {
  addElement: (node: wasm_bindgen.FloDownBlock) => void;
  addSymbolDeclaration?: (name: string) => string | undefined;
};

function addStatementBlocks(fd: FloDownMountBlock, statement: unknown): void {
  if (Array.isArray(statement)) {
    for (const block of statement) {
      fd.addElement(block as wasm_bindgen.FloDownBlock);
    }
    return;
  }
  if (statement && typeof statement === "object") {
    const record = statement as Record<string, unknown>;
    if (record.type === "root" && Array.isArray(record.content)) {
      for (const block of record.content) {
        fd.addElement(block as wasm_bindgen.FloDownBlock);
      }
      return;
    }
    if (typeof record.type === "string") {
      fd.addElement(statement as wasm_bindgen.FloDownBlock);
    }
  }
}

/** Rewrite persisted JSON (headings, for_symbols, strip symdecl) and mount. URIs pass through. */
export function mountStatementOnFloDown(
  fd: FloDownMountBlock,
  statement: unknown,
): unknown {
  const rewritten = rewriteStatementForFloDown(statement);
  addStatementBlocks(fd, rewritten);
  return rewritten;
}
