export function uriToSymbolName(uri: string): string {
  if (uri.startsWith("LOCAL:")) return uri.slice("LOCAL:".length);
  try {
    const url = new URL(uri);
    return url.searchParams.get("s") || uri;
  } catch {
    return uri;
  }
}

export type ParsedMathHubUri = {
  archive: string;
  filePath: string;
  fileName: string;
  language: string;
  symbol: string;
  conceptUri: string;
};

export function parseUri(uri: string): ParsedMathHubUri {
  const url = new URL(uri);
  const params = url.searchParams;
  return {
    archive: params.get("a") || "",
    filePath: params.get("f") || "",
    fileName: params.get("d") || "",
    language: params.get("l") || "en",
    symbol: params.get("s") || "",
    conceptUri: uri,
  };
}

export function normalizeSymRef(symRef: any): { uri: string; text: string } {
  if (symRef.source === "MATHHUB") {
    const parsed = parseUri(symRef.uri);
    return { uri: parsed.conceptUri, text: parsed.symbol };
  }
  return { uri: `LOCAL:${symRef.symbolName}`, text: symRef.symbolName };
}

export function transform(ast: any, operation: any): any {
  if (operation.kind === "removeSemantic") {
    return removeSemanticNode(ast, operation.target);
  }
  if (operation.kind === "replaceSemantic") {
    return replaceSemanticNode(ast, operation.target, operation.payload);
  }
  return ast;
}

function removeSemanticNode(
  node: any,
  target: { type: string; uri: string },
): any {
  if (Array.isArray(node)) {
    const result: any[] = [];
    for (const child of node) {
      if (
        typeof child === "object" &&
        child?.type === target.type &&
        child?.uri === target.uri
      ) {
        if (child.content) result.push(...child.content);
      } else {
        result.push(removeSemanticNode(child, target));
      }
    }
    return result;
  }
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;

  const copy = { ...node };
  if (copy.content) copy.content = removeSemanticNode(copy.content, target);
  return copy;
}

function replaceSemanticNode(
  node: any,
  target: { type: string; uri: string },
  payload: any,
): any {
  if (Array.isArray(node)) {
    return node.map((child) => replaceSemanticNode(child, target, payload));
  }

  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;

  if (node.type === target.type && node.uri === target.uri) {
    if (node.type === "symref") {
      return {
        ...node,
        uri: payload.uri,
      };
    }
    if (node.type === "definition" && node.for_symbols) {
      return {
        ...node,
        for_symbols: node.for_symbols.map((s: string) =>
          s === target.uri ? payload.uri : s,
        ),
        content: replaceSemanticNode(node.content, target, payload),
      };
    }
    return { ...node, ...payload };
  }

  const copy = { ...node };
  if (copy.content) {
    copy.content = replaceSemanticNode(copy.content, target, payload);
  }
  return copy;
}
