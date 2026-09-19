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
  fromUri: string,
  toUri: string,
): FloDownContent[] {
  return mapInlines(content, (item) => {
    if (typeof item === "string") return item;

    if (
      (item.type === "definiendum" || item.type === "symref") &&
      item.uri === fromUri
    ) {
      return { ...item, uri: toUri };
    }

    return item;
  });
}

function retargetUriInBlock(
  block: PersistedBlock,
  fromUri: string,
  toUri: string,
): PersistedBlock {
  return mapInlineContent(block, (content) =>
    replaceUriInContent(content, fromUri, toUri),
  );
}

export function retargetUriInAst(
  ast: FloDownStatement,
  fromUri: string,
  toUri: string,
): FloDownStatement {
  if (Array.isArray(ast)) {
    return ast.map((block) => retargetUriInBlock(block, fromUri, toUri));
  }
  if (ast.type === "root") {
    return {
      ...ast,
      content: ast.content.map((block) =>
        retargetUriInBlock(block, fromUri, toUri),
      ),
    };
  }
  return retargetUriInBlock(ast, fromUri, toUri);
}

export function astReferencesUri(ast: FloDownStatement, uri: string): boolean {
  function scanContent(content: FloDownContent[]): boolean {
    for (const item of content) {
      if (typeof item === "string") continue;

      if (
        (item.type === "definiendum" || item.type === "symref") &&
        item.uri === uri
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
