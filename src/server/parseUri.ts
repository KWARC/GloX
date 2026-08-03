import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  isDefiniendumNode,
  type DefiniendumNode,
  type DefinitionNode,
  type FloDownContent,
  type FloDownNode,
  type FloDownStatement,
} from "@/types/floDown.types";

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

type FloDownTree = FloDownStatement | FloDownNode | FloDownContent | FloDownContent[];

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
  content?: FloDownContent[];
  symdecl: boolean;
};

export type ReplaceSymrefPayload = {
  type: "symref";
  uri: string;
  content?: FloDownContent[];
};

export type ReplacePayload = ReplaceDefiniendumPayload | ReplaceSymrefPayload;

export function parseUri(uri: string): ParsedMathHubUri {
  const url = new URL(uri);
  const params = url.searchParams;
  return {
    archive: params.get("a") || "",
    filePath: params.get("p") || "",
    fileName: params.get("d") || params.get("m") || "",
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

function normalizeContent(content: FloDownContent[]): FloDownContent[] {
  const result: FloDownContent[] = [];

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

export function findDefiniendum(content: FloDownContent[], symbolName: string): boolean {
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
      const uri = normalize(c.uri);

      if (uri === symbolName) {
        return true;
      }
    }

    if (c.content && findDefiniendum(c.content, symbolName)) {
      return true;
    }
  }

  return false;
}

export function transform(ast: FloDownTree, operation: SemanticOperation): FloDownTree {
  if (operation.kind === "removeSemantic") {
    return removeSemanticNodeWithIndex(ast, operation.target);
  }
  if (operation.kind === "replaceSemantic") {
    return replaceSemanticNode(ast, operation.target, operation.payload);
  }
  return ast;
}

function removeSemanticNode(
  node: FloDownTree,
  target: { type: "definiendum" | "symref"; uri: string },
): FloDownTree {
  if (Array.isArray(node)) {
    const result: FloDownContent[] = [];

    for (const child of node) {
      if (
        typeof child === "object" &&
        child &&
        (child as FloDownNode).type === target.type &&
        (child as FloDownNode).uri === target.uri
      ) {
        const childNode = child as FloDownNode;

        if (childNode.content) {
          for (const c of childNode.content as FloDownContent[]) {
            result.push(c);
          }
        }
      } else {
        const transformed = removeSemanticNode(child as FloDownTree, target);

        if (Array.isArray(transformed)) {
          result.push(...transformed);
        } else {
          result.push(transformed as FloDownContent);
        }
      }
    }

    return normalizeContent(result);
  }
  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;

  const copy: FloDownNode = { ...(node as FloDownNode) };
  if (copy.content) {
    copy.content = normalizeContent(
      removeSemanticNode(copy.content as FloDownContent[], target) as FloDownContent[],
    );
  }
  return copy;
}
function removeSemanticNodeWithIndex(
  node: FloDownTree,
  target: { type: "definiendum" | "symref"; uri: string },
): FloDownTree {
  if (!node || typeof node !== "object") return node;

  if ((node as FloDownNode).type === "definition") {
    const definitionNode = node as DefinitionNode;
    return {
      ...definitionNode,
      content: removeSemanticNode(definitionNode.content as FloDownContent[], target) as FloDownContent[],
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
  node: FloDownTree,
  target: { type: "definiendum" | "symref"; uri: string },
  payload: ReplacePayload,
): FloDownTree {
  if (Array.isArray(node)) {
    return node.map((child) =>
      replaceSemanticNode(child as FloDownTree, target, payload),
    ) as typeof node;
  }

  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;

  const current = node as FloDownNode;

  if (current.type === "definition") {
    const def = current as DefinitionNode;

    const updatedContent = replaceSemanticNode(
      def.content as FloDownContent[],
      target,
      payload,
    ) as FloDownContent[];

    return {
      ...def,
      content: updatedContent,
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

  const copy: FloDownNode = { ...current };

  if (copy.content) {
    copy.content = replaceSemanticNode(
      copy.content as FloDownContent[],
      target,
      payload,
    ) as FloDownContent[];
  }

  return copy;
}
