import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import type {
  DefinitionNode,
  FtmlContent,
  FtmlNode,
  FtmlRoot,
} from "@/types/ftml.types";

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

export function normalizeSymRef(symRef: UnifiedSymbolicReference): {
  uri: string;
  text: string;
} {
  if (symRef.source === "MATHHUB") {
    const parsed = parseUri(symRef.uri);
    return { uri: parsed.conceptUri, text: parsed.symbol };
  }
  return { uri: `LOCAL:${symRef.symbolName}`, text: symRef.symbolName };
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

type RemoveSemanticOperation = {
  kind: "removeSemantic";
  target: { type: "definiendum" | "symref"; uri: string };
};

type ReplaceSemanticOperation = {
  kind: "replaceSemantic";
  target: { type: "definiendum" | "symref"; uri: string };
  payload: Partial<FtmlNode> & { uri?: string };
};

export type SemanticOperation =
  | RemoveSemanticOperation
  | ReplaceSemanticOperation;

type FtmlTree = FtmlRoot | FtmlNode | FtmlContent | FtmlContent[];

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

function replaceSemanticNode(
  node: FtmlTree,
  target: { type: "definiendum" | "symref"; uri: string },
  payload: ReplaceSemanticOperation["payload"],
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

    return {
      ...def,
      content: updatedContent,
      for_symbols: Array.isArray(def.for_symbols)
        ? def.for_symbols.filter((s) => s !== target.uri)
        : def.for_symbols,
    };
  }

  if (current.type === target.type && current.uri === target.uri) {
    return {
      ...current,
      uri: payload.uri ?? current.uri,
      ...(current.type === "definiendum" ? { symdecl: false } : {}),
    };
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
