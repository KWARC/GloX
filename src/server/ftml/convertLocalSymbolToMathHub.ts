import {
  DefinitionNode,
  FtmlContent,
  FtmlNode,
  FtmlRoot,
  isDefiniendumNode,
  isDefinitionNode,
} from "@/types/ftml.types";

export function assertFtmlRoot(value: unknown): asserts value is FtmlRoot {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid FTML AST");
  }
}

function hasLocalDefiniendum(node: DefinitionNode, symbolUri: string): boolean {
  function scan(content: FtmlContent[]): boolean {
    for (const item of content) {
      if (typeof item === "string") continue;
      if (
        isDefiniendumNode(item) &&
        item.symdecl === true &&
        item.uri === symbolUri
      )
        return true;
      if (item.content && scan(item.content)) return true;
    }
    return false;
  }
  return scan(node.content);
}

function replaceUriInContent(
  content: FtmlContent[],
  localUri: string,
  mathHubUri: string,
): FtmlContent[] {
  return content.map((item): FtmlContent => {
    if (typeof item === "string") return item;

    if (
      (item.type === "definiendum" || item.type === "symref") &&
      item.uri === localUri
    ) {
      const replaced: FtmlNode = { ...item, uri: mathHubUri };
      if (typeof item !== "string" && item.content)
        replaced.content = replaceUriInContent(
          item.content,
          localUri,
          mathHubUri,
        );
      return replaced;
    }

    if (typeof item !== "string" && item.content) {
      return {
        ...item,
        content: replaceUriInContent(item.content, localUri, mathHubUri),
      } as FtmlNode;
    }
    return item;
  });
}

function propagateUriInNode(
  node: FtmlNode,
  localUri: string,
  mathHubUri: string,
): FtmlNode {
  if (isDefinitionNode(node)) {
    const updatedContent = replaceUriInContent(
      node.content,
      localUri,
      mathHubUri,
    );
    const updatedDef: DefinitionNode = { ...node, content: updatedContent };

    if (
      updatedDef.for_symbols.includes(localUri) &&
      !hasLocalDefiniendum(updatedDef, localUri)
    ) {
      updatedDef.for_symbols = updatedDef.for_symbols.filter(
        (s) => s !== localUri,
      );
    }
    return updatedDef;
  }

  if (
    (node.type === "definiendum" || node.type === "symref") &&
    node.uri === localUri
  ) {
    const replaced: FtmlNode = { ...node, uri: mathHubUri };
    if (node.content)
      replaced.content = replaceUriInContent(
        node.content,
        localUri,
        mathHubUri,
      );
    return replaced;
  }

  if (node.content) {
    return {
      ...node,
      content: replaceUriInContent(node.content, localUri, mathHubUri),
    };
  }
  return node;
}

export function propagateUriInAst(
  ast: FtmlRoot,
  localUri: string,
  mathHubUri: string,
): FtmlRoot {
  if (Array.isArray(ast)) {
    return ast.map((node) =>
      typeof node === "string"
        ? node
        : propagateUriInNode(node, localUri, mathHubUri),
    );
  }
  if (ast.type === "root") {
    return {
      ...ast,
      content: (ast.content ?? []).map((node) =>
        typeof node === "string"
          ? node
          : propagateUriInNode(node, localUri, mathHubUri),
      ),
    };
  }
  return propagateUriInNode(ast, localUri, mathHubUri);
}

export function astReferencesUri(ast: FtmlRoot, localUri: string): boolean {
  function scanContent(content: FtmlContent[]): boolean {
    for (const item of content) {
      if (typeof item === "string") continue;

      if (
        (item.type === "definiendum" || item.type === "symref") &&
        item.uri === localUri
      ) {
        return true;
      }

      if (item.content && scanContent(item.content)) {
        return true;
      }
    }
    return false;
  }

  if (Array.isArray(ast)) {
    return ast.some(
      (n) => typeof n !== "string" && n.content && scanContent(n.content),
    );
  }

  if (ast.type === "root" && ast.content) {
    return (
      ast.content?.some(
        (n) => typeof n !== "string" && n.content && scanContent(n.content),
      ) ?? false
    );
  }

  return (
    typeof ast !== "string" &&
    ast.content !== undefined &&
    scanContent(ast.content)
  );
}

export function definitionContainsLocalSymbol(
  statements: FtmlRoot[],
  symbolUri: string,
): boolean {
  function checkContent(content: FtmlContent[]): boolean {
    for (const item of content) {
      if (typeof item === "string") continue;

      if (
        isDefiniendumNode(item) &&
        item.symdecl === true &&
        item.uri === symbolUri
      ) {
        return true;
      }

      if (item.content && checkContent(item.content)) {
        return true;
      }
    }
    return false;
  }

  return statements.some((ast) => {
    if (Array.isArray(ast)) {
      return ast.some(
        (n) => typeof n !== "string" && n.content && checkContent(n.content),
      );
    }

    if (ast.type === "root") {
      return (ast.content ?? []).some(
        (n) => typeof n !== "string" && n.content && checkContent(n.content),
      );
    }

    return (
      typeof ast !== "string" &&
      ast.content !== undefined &&
      checkContent(ast.content)
    );
  });
}
