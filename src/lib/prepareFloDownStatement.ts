/// <reference path="../../public/flodown/flodown.d.ts" />

export type FloDownUriReplacement = {
  from: string;
  to: string;
  reason: string;
};

const HEADING_LEVEL_NAMES = [
  "Section",
  "SubSection",
  "SubSubSection",
  "Paragraph",
  "SubParagraph",
] as const;

type DeclareBlock = {
  addSymbolDeclaration: (name: string) => string | undefined;
};

function isHttp(uri: string): boolean {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

function resolveUri(
  uri: string,
  block: DeclareBlock,
  declared: Map<string, string>,
  replacements: FloDownUriReplacement[],
  knownUris?: ReadonlyMap<string, string>,
): string {
  if (declared.has(uri)) {
    return declared.get(uri)!;
  }

  if (!isHttp(uri)) {
    if (knownUris?.has(uri)) {
      const to = knownUris.get(uri)!;
      declared.set(uri, to);
      if (to !== uri) {
        replacements.push({
          from: uri,
          to,
          reason: "knownUriMap",
        });
      }
      return to;
    }

    const created = block.addSymbolDeclaration(uri);
    const to = created ?? uri;
    declared.set(uri, to);
    if (to !== uri) {
      replacements.push({
        from: uri,
        to,
        reason: "addSymbolDeclaration",
      });
    }
    return to;
  }

  declared.set(uri, uri);
  return uri;
}

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

function rewriteNode(
  value: unknown,
  block: DeclareBlock,
  declared: Map<string, string>,
  replacements: FloDownUriReplacement[],
  inDefinition: boolean,
  knownUris?: ReadonlyMap<string, string>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      rewriteNode(
        item,
        block,
        declared,
        replacements,
        inDefinition,
        knownUris,
      ),
    );
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

    if (key === "uri" && typeof child === "string") {
      next.uri = resolveUri(
        child,
        block,
        declared,
        replacements,
        knownUris,
      );
      continue;
    }

    if (key === "for_symbols" && Array.isArray(child)) {
      next.for_symbols = child.map((item) =>
        typeof item === "string"
          ? resolveUri(item, block, declared, replacements, knownUris)
          : item,
      );
      continue;
    }

    next[key] = rewriteNode(
      child,
      block,
      declared,
      replacements,
      nextInDefinition,
      knownUris,
    );
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
export function rewriteStatementForFloDown(
  statement: unknown,
  block: DeclareBlock,
  _identity: {
    futureRepo: string;
    filePath: string;
    fileName: string;
  },
  options?: {
    /** Pre-resolved short names (e.g. module-local symbols from sibling definition blocks). */
    knownUris?: ReadonlyMap<string, string>;
  },
): { statement: unknown; replacements: FloDownUriReplacement[] } {
  const replacements: FloDownUriReplacement[] = [];
  const declared = new Map<string, string>();
  return {
    statement: rewriteNode(
      structuredClone(statement),
      block,
      declared,
      replacements,
      false,
      options?.knownUris,
    ),
    replacements,
  };
}

export type FloDownMountBlock = DeclareBlock & {
  addElement: (node: wasm_bindgen.FloDownBlock) => void;
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

/** Rewrite persisted JSON and mount every top-level block on a live FloDown document. */
export function mountStatementOnFloDown(
  fd: FloDownMountBlock,
  statement: unknown,
  identity: {
    futureRepo: string;
    filePath: string;
    fileName: string;
  },
  options?: {
    knownUris?: ReadonlyMap<string, string>;
  },
): { replacements: FloDownUriReplacement[]; statement: unknown } {
  const { statement: rewritten, replacements } = rewriteStatementForFloDown(
    statement,
    fd,
    identity,
    options,
  );
  addStatementBlocks(fd, rewritten);
  return { replacements, statement: rewritten };
}
