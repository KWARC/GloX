import {
  DefinitionNode,
  FloDownContent,
  FloDownNode,
  FloDownStatement,
  isDefiniendumNode,
  isDefinitionNode,
} from "@/types/floDown.types";

function replaceUriInContent(
  content: FloDownContent[],
  localUri: string,
  mathHubUri: string,
): FloDownContent[] {
  return content.map((item): FloDownContent => {
    if (typeof item === "string") return item;

    if (
      (item.type === "definiendum" || item.type === "symref") &&
      item.uri === localUri
    ) {
      const replaced: FloDownNode = { ...item, uri: mathHubUri };
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
      } as FloDownNode;
    }
    return item;
  });
}

function propagateUriInNode(
  node: FloDownNode,
  localUri: string,
  mathHubUri: string,
): FloDownNode {
  if (isDefinitionNode(node)) {
    const updatedContent = replaceUriInContent(
      node.content,
      localUri,
      mathHubUri,
    );
    const updatedDef: DefinitionNode = { ...node, content: updatedContent };
    return updatedDef;
  }

  if (
    (node.type === "definiendum" || node.type === "symref") &&
    node.uri === localUri
  ) {
    const replaced: FloDownNode = { ...node, uri: mathHubUri };
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
  ast: FloDownStatement,
  localUri: string,
  mathHubUri: string,
): FloDownStatement {
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

export function astReferencesUri(ast: FloDownStatement, localUri: string): boolean {
  function scanContent(content: FloDownContent[]): boolean {
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
  statements: FloDownStatement[],
  symbolUri: string,
): boolean {
  function checkContent(content: FloDownContent[]): boolean {
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
