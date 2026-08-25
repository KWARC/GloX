import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  hasInlineChildren,
  isDefiniendumNode,
  isPersistedBlock,
  type DefiniendumNode,
  type FloDownContent,
  type FloDownStatement,
  type Inline,
  type InlineInDefinition,
  type PersistedBlock,
  type RootNode,
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

type FloDownTree = FloDownStatement | FloDownContent | FloDownContent[];

function isPersistedBlockArray(
  node: readonly unknown[],
): node is PersistedBlock[] {
  const first = node[0];
  return (
    typeof first === "object" &&
    first !== null &&
    isPersistedBlock(first as PersistedBlock)
  );
}

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
  return {
    uri: localSymbolUri(symRef),
    text: symRef.symbolName,
  };
}

function localSymbolUri(symRef: Extract<UnifiedSymbolicReference, { source: "DB" }>): string {
  const uri = (symRef.symbolUri ?? "").trim();
  if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
    throw new Error("Symbol URI required");
  }
  return uri;
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

    if (hasInlineChildren(c) && findDefiniendum(c.content, symbolName)) {
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

function removeSemanticFromInlines(
  content: FloDownContent[],
  target: { type: "definiendum" | "symref"; uri: string },
): FloDownContent[] {
  const result: FloDownContent[] = [];

  for (const child of content) {
    if (
      typeof child === "object" &&
      child.type === target.type &&
      child.uri === target.uri
    ) {
      if (hasInlineChildren(child)) {
        for (const c of child.content) {
          result.push(c);
        }
      }
      continue;
    }

    if (typeof child === "string") {
      result.push(child);
      continue;
    }

    if (hasInlineChildren(child)) {
      result.push({
        ...child,
        content: removeSemanticFromInlines(child.content, target),
      } as FloDownContent);
      continue;
    }

    result.push(child);
  }

  return normalizeContent(result);
}

function removeSemanticNode(
  node: FloDownTree,
  target: { type: "definiendum" | "symref"; uri: string },
): FloDownTree {
  if (Array.isArray(node)) {
    if (isPersistedBlockArray(node)) {
      return node.map((block) =>
        removeSemanticNode(block, target) as PersistedBlock,
      );
    }
    return removeSemanticFromInlines(node as FloDownContent[], target);
  }

  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;

  if (node.type === "root") {
    const root = node as RootNode;
    return {
      ...root,
      content: root.content.map(
        (block) => removeSemanticNode(block, target) as PersistedBlock,
      ),
    };
  }

  if (isPersistedBlock(node)) {
    if (node.type === "definition") {
      return {
        ...node,
        content: node.content.map((inner) => {
          if (inner.type !== "paragraph") return inner;
          return {
            ...inner,
            content: removeSemanticFromInlines(
              inner.content,
              target,
            ) as InlineInDefinition[],
          };
        }),
      };
    }

    return {
      ...node,
      content: removeSemanticFromInlines(
        node.content,
        target,
      ) as Inline[],
    };
  }

  return node;
}

function removeSemanticNodeWithIndex(
  node: FloDownTree,
  target: { type: "definiendum" | "symref"; uri: string },
): FloDownTree {
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

function replaceSemanticInInlines(
  content: FloDownContent[],
  target: { type: "definiendum" | "symref"; uri: string },
  payload: ReplacePayload,
): FloDownContent[] {
  return content.map((item) => {
    if (typeof item === "string") return item;

    const currentUri = normalizeUri("uri" in item ? item.uri : undefined);
    const targetUri = normalizeUri(target.uri);

    if (
      (item.type === "definiendum" || item.type === "symref") &&
      currentUri === targetUri
    ) {
      if (item.type === "definiendum" && payload.type === "definiendum") {
        return {
          ...(item as DefiniendumNode),
          uri: payload.uri,
          content: payload.content ?? item.content,
          symdecl: payload.symdecl,
        } as FloDownContent;
      }

      if (item.type === "symref" && payload.type === "symref") {
        return {
          ...item,
          uri: payload.uri,
          content: payload.content ?? item.content,
        } as FloDownContent;
      }
    }

    if (hasInlineChildren(item)) {
      return {
        ...item,
        content: replaceSemanticInInlines(item.content, target, payload),
      } as FloDownContent;
    }

    return item;
  });
}

function replaceSemanticNode(
  node: FloDownTree,
  target: { type: "definiendum" | "symref"; uri: string },
  payload: ReplacePayload,
): FloDownTree {
  if (Array.isArray(node)) {
    if (isPersistedBlockArray(node)) {
      return node.map((block) =>
        replaceSemanticNode(block, target, payload) as PersistedBlock,
      );
    }
    return replaceSemanticInInlines(node as FloDownContent[], target, payload);
  }

  if (typeof node === "string") return node;
  if (!node || typeof node !== "object") return node;

  if (node.type === "root") {
    const root = node as RootNode;
    return {
      ...root,
      content: root.content.map(
        (block) => replaceSemanticNode(block, target, payload) as PersistedBlock,
      ),
    };
  }

  if (isPersistedBlock(node)) {
    if (node.type === "definition") {
      return {
        ...node,
        content: node.content.map((inner) => {
          if (inner.type !== "paragraph") return inner;
          return {
            ...inner,
            content: replaceSemanticInInlines(
              inner.content,
              target,
              payload,
            ) as InlineInDefinition[],
          };
        }),
      };
    }

    return {
      ...node,
      content: replaceSemanticInInlines(
        node.content,
        target,
        payload,
      ) as Inline[],
    };
  }

  return node;
}
