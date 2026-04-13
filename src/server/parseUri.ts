import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  isDefiniendumNode,
  type DefiniendumNode,
  type DefinitionNode,
  type FtmlContent,
  type FtmlNode,
  type FtmlRoot,
} from "@/types/ftml.types";

type RemoveSemanticOperation = {
  kind: "removeSemantic";
  target: { type: "definiendum" | "symref"; uri: string };
};

type ReplaceSemanticOperation = {
  kind: "replaceSemantic";
  target: { type: "definiendum" | "symref"; uri: string };
  payload: ReplacePayload;
};

export type SemanticOperation =
  | RemoveSemanticOperation
  | ReplaceSemanticOperation;

type FtmlTree = FtmlRoot | FtmlNode | FtmlContent | FtmlContent[];

export type ParsedMathHubUri = {
  archive: string;
  filePath: string;
  fileName: string;
  language: string;
  symbol: string;
  conceptUri: string;
};

export type ReplaceDefiniendumPayload = {
  type: "definiendum";
  uri: string;
  content?: FtmlContent[];
  symdecl: boolean;
};

export type ReplaceSymrefPayload = {
  type: "symref";
  uri: string;
  content?: FtmlContent[];
};

export type ReplacePayload = ReplaceDefiniendumPayload | ReplaceSymrefPayload;

export function parseUri(uri: string): ParsedMathHubUri {
  const url = new URL(uri);
  const params = url.searchParams;
  return {
    archive: params.get("a") || "",
    filePath: params.get("p") || "",
    fileName: params.get("d") || "",
    language: params.get("l") || "en",
    symbol: params.get("s") || "",
    conceptUri: uri,
  };
}

export function normalizeSymRef(symRef: UnifiedSymbolicReference): {
  uri: string;
  text: string;
} {
  if (symRef.source === "MATHHUB") {
    const parsed = parseUri(symRef.uri);
    return { uri: parsed.conceptUri, text: parsed.symbol };
  }
  return { uri: `${symRef.symbolName}`, text: symRef.symbolName };
}

function normalizeContent(content: FtmlContent[]): FtmlContent[] {
  const result: FtmlContent[] = [];

  for (const item of content) {
    if (typeof item === "string") {
      if (item === "") continue;

      const prev = result[result.length - 1];

      if (typeof prev === "string") {
        result[result.length - 1] = prev + item;
      } else {
        result.push(item);
      }
    } else {
      result.push(item);
    }
  }

  return result;
}

export function findDefiniendum(
  content: FtmlContent[],
  symbolName: string,
): boolean {
  const normalize = (u: string) => {
    if (!u) return u;
    if (u.startsWith("http")) {
      try {
        return new URL(u).searchParams.get("s") ?? u;
      } catch {
        return u;
      }
    }
    return u;
  };

  for (const c of content) {
    if (typeof c === "string") continue;

    if (isDefiniendumNode(c)) {
      if (c.symdecl === true && normalize(c.uri) === symbolName) {
        return true;
      }
    }

    if (c.content && findDefiniendum(c.content, symbolName)) {
      return true;
    }
  }

  return false;
}

export function transform(
  ast: FtmlTree,
  operation: SemanticOperation,
): FtmlTree {
  if (operation.kind === "removeSemantic") {
    return removeSemanticNodeWithIndex(ast, operation.target);
  }
  if (operation.kind === "replaceSemantic") {
    return replaceSemanticNode(ast, operation.target, operation.payload);
  }
  return ast;
}

function removeSemanticNode(
  node: FtmlTree,
  target: { type: "definiendum" | "symref"; uri: string },
): FtmlTree {
  if (Array.isArray(node)) {
    const result: FtmlContent[] = [];

    for (const child of node) {
      if (
        typeof child === "object" &&
        child &&
        (child as FtmlNode).type === target.type &&
        (child as FtmlNode).uri === target.uri
      ) {
        const childNode = child as FtmlNode;

        if (childNode.content) {
          for (const c of childNode.content as FtmlContent[]) {
            result.push(c);
          }
        }
      } else {
        const transformed = removeSemanticNode(child as FtmlTree, target);

        if (Array.isArray(transformed)) {
          result.push(...transformed);
        } else {
          result.push(transformed as FtmlContent);
        }
      }
    }

    return normalizeContent(result);
  }
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;

  const copy: FtmlNode = { ...(node as FtmlNode) };
  if (copy.content) {
    copy.content = normalizeContent(
      removeSemanticNode(
        copy.content as FtmlContent[],
        target,
      ) as FtmlContent[],
    );
  }
  return copy;
}
function removeSemanticNodeWithIndex(
  node: FtmlTree,
  target: { type: "definiendum" | "symref"; uri: string },
): FtmlTree {
  if (!node || typeof node !== "object") return node;

  if ((node as FtmlNode).type === "definition") {
    const definitionNode = node as DefinitionNode;
    return {
      ...definitionNode,
      for_symbols: Array.isArray(definitionNode.for_symbols)
        ? definitionNode.for_symbols.filter((s: string) => s !== target.uri)
        : definitionNode.for_symbols,
      content: removeSemanticNode(
        definitionNode.content as FtmlContent[],
        target,
      ) as FtmlContent[],
    };
  }

  return removeSemanticNode(node, target);
}

function normalizeUri(u: string | undefined): string | undefined {
  if (!u) return u;

  if (u.startsWith("http")) {
    try {
      return new URL(u).searchParams.get("s") ?? u;
    } catch {
      return u;
    }
  }

  return u;
}

function replaceSemanticNode(
  node: FtmlTree,
  target: { type: "definiendum" | "symref"; uri: string },
  payload: ReplacePayload,
): FtmlTree {
  if (Array.isArray(node)) {
    return node.map((child) =>
      replaceSemanticNode(child as FtmlTree, target, payload),
    ) as typeof node;
  }

  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;

  const current = node as FtmlNode;

  if (current.type === "definition") {
    const def = current as DefinitionNode;

    const updatedContent = replaceSemanticNode(
      def.content as FtmlContent[],
      target,
      payload,
    ) as FtmlContent[];

    const targetUriNorm = normalizeUri(target.uri);
    let symbols = Array.isArray(def.for_symbols)
      ? def.for_symbols.filter((s) => normalizeUri(s) !== targetUriNorm)
      : [];

    if (
      payload.type === "definiendum" &&
      payload.uri &&
      !payload.uri.startsWith("http")
    ) {
      symbols.push(payload.uri);
    }

    symbols = Array.from(new Set(symbols));

    return {
      ...def,
      content: updatedContent,
      for_symbols: symbols,
    };
  }

  const currentUri = normalizeUri(current.uri);
  const targetUri = normalizeUri(target.uri);

  const isSemanticNode =
    current.type === "definiendum" || current.type === "symref";

  if (isSemanticNode && currentUri === targetUri) {
    if (current.type === "definiendum" && payload.type === "definiendum") {
      return {
        ...(current as DefiniendumNode),
        uri: payload.uri,
        content: payload.content ?? current.content,
        symdecl: payload.symdecl,
      } as DefiniendumNode;
    }

    if (current.type === "symref" && payload.type === "symref") {
      return {
        ...current,
        uri: payload.uri,
        content: payload.content ?? current.content,
      };
    }
  }

  const copy: FtmlNode = { ...current };

  if (copy.content) {
    copy.content = replaceSemanticNode(
      copy.content as FtmlContent[],
      target,
      payload,
    ) as FtmlContent[];
  }

  return copy;
}
