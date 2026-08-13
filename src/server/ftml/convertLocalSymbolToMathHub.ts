import {
  FloDownContent,
  FloDownStatement,
  isDefiniendumNode,
  isDefinitionNode,
  normalizeToRoot,
  PersistedBlock,
} from "@/types/floDown.types";
import { mapInlineContent, mapInlines } from "@/server/ftml/statementContent";

function replaceUriInContent(
  content: FloDownContent[],
  localUri: string,
  mathHubUri: string,
): FloDownContent[] {
  return mapInlines(content, (item) => {
    if (typeof item === "string") return item;

    if (
      (item.type === "definiendum" || item.type === "symref") &&
      item.uri === localUri
    ) {
      return { ...item, uri: mathHubUri };
    }

    return item;
  });
}

function propagateUriInBlock(
  block: PersistedBlock,
  localUri: string,
  mathHubUri: string,
): PersistedBlock {
  return mapInlineContent(block, (content) =>
    replaceUriInContent(content, localUri, mathHubUri),
  );
}

export function propagateUriInAst(
  ast: FloDownStatement,
  localUri: string,
  mathHubUri: string,
): FloDownStatement {
  if (Array.isArray(ast)) {
    return ast.map((block) => propagateUriInBlock(block, localUri, mathHubUri));
  }
  if (ast.type === "root") {
    return {
      ...ast,
      content: ast.content.map((block) =>
        propagateUriInBlock(block, localUri, mathHubUri),
      ),
    };
  }
  return propagateUriInBlock(ast, localUri, mathHubUri);
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

      if ("content" in item && item.content && scanContent(item.content)) {
        return true;
      }
    }
    return false;
  }

  const root = normalizeToRoot(ast);
  return root.content.some((block) => {
    if (isDefinitionNode(block)) {
      return block.content.some(
        (inner) => inner.type === "paragraph" && scanContent(inner.content),
      );
    }
    if (block.type === "paragraph") {
      return scanContent(block.content);
    }
    return false;
  });
}

export function definitionContainsLocalSymbol(
  statements: FloDownStatement[],
  symbolUri: string,
): boolean {
  return statements.some((ast) => {
    const root = normalizeToRoot(ast);
    return root.content.some((block) => {
      if (!isDefinitionNode(block)) return false;
      return block.content.some(
        (inner) =>
          inner.type === "paragraph" &&
          inner.content.some(
            (item) =>
              isDefiniendumNode(item) &&
              item.symdecl === true &&
              item.uri === symbolUri,
          ),
      );
    });
  });
}
