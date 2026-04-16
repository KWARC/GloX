import { FtmlContent, FtmlNode, RootNode } from "@/types/ftml.types";

export interface TextLocation {
  paragraphIndex: number;
  contentIndex: number;
  offset: number;
  occurrence: number;
}

export function cloneAst<T>(ast: T): T {
  return structuredClone(ast);
}

export function walkAst(
  node: FtmlContent | FtmlContent[],
  visitor: (
    node: FtmlNode,
    path: number[],
    parent?: FtmlNode,
  ) => void | boolean,
  path: number[] = [],
  parent?: FtmlNode,
): void | boolean {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const result = walkAst(node[i], visitor, [...path, i], parent);
      if (result === false) return false;
    }
    return;
  }

  if (typeof node === "string") return;

  const shouldContinue = visitor(node, path, parent);
  if (shouldContinue === false) return false;

  if (node.content) {
    const result = walkAst(node.content, visitor, path, node);
    if (result === false) return false;
  }
}

export function extractTextContent(node: FtmlContent | FtmlContent[]): string {
  if (Array.isArray(node)) {
    return node.map(extractTextContent).join("");
  }

  if (typeof node === "string") {
    return node;
  }

  if (node.content) {
    return extractTextContent(node.content);
  }

  return "";
}

export function pathTraversesSemanticNode(
  root: RootNode,
  targetPath: number[],
): boolean {
  const SEMANTIC_TYPES = new Set(["symref", "definiendum", "definiens"]);
  let traversesSemanticNode = false;

  walkAst(root, (node, path) => {
    if (path.length > 0 && path.length < targetPath.length) {
      const isAncestor = path.every((segment, i) => segment === targetPath[i]);

      if (isAncestor && SEMANTIC_TYPES.has(node.type)) {
        traversesSemanticNode = true;
        return false;
      }
    }
  });

  return traversesSemanticNode;
}

export function findAllTextOccurrences(
  root: RootNode,
  searchText: string,
): TextLocation[] {
  const locations: TextLocation[] = [];

  root.content.forEach((node, paragraphIndex) => {
    let paragraphContent: FtmlContent[];

    if (node.type === "paragraph") {
      paragraphContent = node.content || [];
    } else if (node.type === "definition") {
      const firstChild = node.content?.[0];
      if (
        firstChild &&
        typeof firstChild !== "string" &&
        firstChild.type === "paragraph"
      ) {
        paragraphContent = firstChild.content || [];
      } else {
        return;
      }
    } else {
      return;
    }

    paragraphContent.forEach((item, contentIndex) => {
      if (typeof item === "string") {
        let offset = 0;
        let occurrence = 0;

        while (true) {
          const index = item.indexOf(searchText, offset);
          if (index === -1) break;

          locations.push({
            paragraphIndex,
            contentIndex,
            offset: index,
            occurrence,
          });

          offset = index + 1;
          occurrence++;
        }
      }
    });
  });

  return locations;
}

export function replaceTextWithNode(
  root: RootNode,
  location: TextLocation,
  startOffset: number,
  endOffset: number,
  node: FtmlNode,
): RootNode {
  const cloned = cloneAst(root);

  const targetParagraph = cloned.content[location.paragraphIndex];

  let paragraphContent: FtmlContent[];

  if (targetParagraph.type === "paragraph") {
    paragraphContent = targetParagraph.content || [];
  } else if (targetParagraph.type === "definition") {
    const firstChild = targetParagraph.content?.[0];
    if (
      firstChild &&
      typeof firstChild !== "string" &&
      firstChild.type === "paragraph"
    ) {
      paragraphContent = firstChild.content || [];
    } else {
      throw new Error("Invalid definition structure");
    }
  } else {
    throw new Error("Target is not a paragraph or definition");
  }

  const textNode = paragraphContent[location.contentIndex];

  if (typeof textNode !== "string") {
    throw new Error("Target node is not a text node");
  }

  const before = textNode.slice(0, startOffset);
  const after = textNode.slice(endOffset);

  const replacement: FtmlContent[] = [];
  if (before) replacement.push(before);
  replacement.push(node);
  if (after) replacement.push(after);

  paragraphContent.splice(location.contentIndex, 1, ...replacement);

  return cloned;
}
