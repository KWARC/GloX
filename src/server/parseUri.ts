import { UnifiedSymbolicReference } from "./document/SymbolicRef.types";

export interface ParsedMathHubUri {
  archive: string;
  filePath: string;
  fileName: string;
  language: string;
  conceptUri: string;
  symbol: string;
}

export function parseUri(uri: string): ParsedMathHubUri {
  const url = new URL(uri);
  const params = url.searchParams;

  const archiveParam = params.get("a") ?? "";
  const pParam = params.get("p") ?? "";

  const [archive, ...pathParts] = archiveParam.split("/");
  const filePath = pParam || pathParts.join("/");

  const d = params.get("d");
  const l = params.get("l");
  const m = params.get("m");
  const s = params.get("s");

  // ---------- fileName-based ----------
  if (archive && d) {
    return {
      archive,
      filePath,
      fileName: d,
      language: l ?? "en",
      conceptUri: uri,
      symbol: d.replace(/-/g, " "),
    };
  }

  // ---------- conceptName ----------
  if (archive && m && s) {
    return {
      archive,
      filePath,
      fileName: m,
      language: "en",
      conceptUri: uri,
      symbol: s,
    };
  }

  throw new Error("Invalid MathHub URI");
}

export function normalizeSymRef(symRef: UnifiedSymbolicReference): {
  uri: string;
  text: string;
} {
  if (symRef.source === "MATHHUB") {
    return {
      uri: symRef.uri,
      text: symRef.uri,
    };
  }

  // DB symbol
  const uri = `LOCAL:${symRef.symbolName}`;
  return {
    uri,
    text: symRef.symbolName,
  };
}

export function transform(
  node: any,
  operation: {
    kind: "removeSemantic" | "replaceSemantic";
    target: { type: "definiendum" | "symref"; uri: string };
    payload?: any;
  },
): any {
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;

  if (
    node.type === operation.target.type &&
    node.uri === operation.target.uri
  ) {
    if (operation.kind === "removeSemantic") {
      return Array.isArray(node.content) ? node.content.join("") : "";
    }

    if (operation.kind === "replaceSemantic") {
      return {
        ...node,
        ...operation.payload,
      };
    }
  }

  if (Array.isArray(node.content)) {
    return {
      ...node,
      content: node.content.map((c: any) => transform(c, operation)),
    };
  }

  return node;
}

export function uriToSymbolName(uri: string): string {
  if (!uri.startsWith("LOCAL:")) {
    throw new Error(`Invalid definiendum URI: ${uri}`);
  }
  return uri.slice("LOCAL:".length);
}
