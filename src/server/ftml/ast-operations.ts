import { FtmlContent, FtmlNode, RootNode } from "@/types/ftml.types";

/**
 * Deep clone an AST
 */
export function cloneAst<T>(ast: T): T {
  return structuredClone(ast);
}

/**
 * Walk AST and apply visitor function
 * Returns false if visitor returns false (early exit)
 */
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

/**
 * Extract all text content from AST
 */
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

/**
 * Find all nodes of a specific type
 */
export function findNodesByType<T extends FtmlNode>(
  root: FtmlContent | FtmlContent[],
  type: string,
): T[] {
  const results: T[] = [];

  walkAst(root, (node) => {
    if (node.type === type) {
      results.push(node as T);
    }
  });

  return results;
}

/**
 * ✅ FIX 3: Check if path traverses semantic nodes
 * CRITICAL: Prevents nested semantic corruption
 */
export function pathTraversesSemanticNode(
  root: RootNode,
  targetPath: number[],
): boolean {
  const SEMANTIC_TYPES = new Set(["symref", "definiendum", "definiens"]);
  let traversesSemanticNode = false;

  walkAst(root, (node, path) => {
    // Check if this path is an ancestor of targetPath
    if (path.length > 0 && path.length < targetPath.length) {
      const isAncestor = path.every((segment, i) => segment === targetPath[i]);

      if (isAncestor && SEMANTIC_TYPES.has(node.type)) {
        traversesSemanticNode = true;
        return false; // Stop walking
      }
    }
  });

  return traversesSemanticNode;
}

/**
 * ✅ FIX 2: Find text node with occurrence index
 * CRITICAL: Handles duplicate text
 */
export interface TextLocation {
  paragraphIndex: number; // Which top-level paragraph
  contentIndex: number; // Index in paragraph.content
  offset: number; // Offset within text node
  occurrence: number; // Which occurrence (0-based)
}

export function findAllTextOccurrences(
  root: RootNode,
  searchText: string,
): TextLocation[] {
  const locations: TextLocation[] = [];

  // Only search in top-level paragraphs or definition paragraphs
  root.content.forEach((node, paragraphIndex) => {
    let paragraphContent: FtmlContent[];

    if (node.type === "paragraph") {
      paragraphContent = node.content || [];
    } else if (node.type === "definition") {
      // Look inside definition's first paragraph
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

    // Search each text node in this paragraph
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

/**
 * ✅ FIX 2: Find UNIQUE text occurrence
 * Throws if text is not unique
 */
export function findUniqueTextLocation(
  root: RootNode,
  searchText: string,
): TextLocation {
  const occurrences = findAllTextOccurrences(root, searchText);

  if (occurrences.length === 0) {
    throw new Error(`Text "${searchText}" not found in AST`);
  }

  if (occurrences.length > 1) {
    throw new Error(
      `Text "${searchText}" appears ${occurrences.length} times. ` +
        `Selection must be unique within the definition.`,
    );
  }

  return occurrences[0];
}

/**
 * Replace text span with a node at specific location
 */
export function replaceTextWithNode(
  root: RootNode,
  location: TextLocation,
  endOffset: number,
  node: FtmlNode,
): RootNode {
  const cloned = cloneAst(root);

  // Navigate to the target paragraph
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

  // Get the text node
  const textNode = paragraphContent[location.contentIndex];

  if (typeof textNode !== "string") {
    throw new Error("Target node is not a text node");
  }

  // Split the text
  const before = textNode.slice(0, location.offset);
  const after = textNode.slice(endOffset);

  const replacement: FtmlContent[] = [];
  if (before) replacement.push(before);
  replacement.push(node);
  if (after) replacement.push(after);

  // Replace in content array
  paragraphContent.splice(location.contentIndex, 1, ...replacement);

  return cloned;
}

export function insertDefiniendum(
  content: any[],
  selectedText: string,
  createNode: (text: string) => any,
): any[] {
  const pattern = new RegExp(
    `(${selectedText.trim().split(/\s+/).join("\\s+")})`,
  );

  const result: any[] = [];
  let inserted = false;

  for (const item of content) {
    if (typeof item !== "string" || inserted) {
      result.push(item);
      continue;
    }

    const match = item.match(pattern);
    if (!match) {
      result.push(item);
      continue;
    }

    const [matchedText] = match;
    const index = item.indexOf(matchedText);

    if (index === -1) {
      result.push(item);
      continue;
    }

    const before = item.slice(0, index);
    const after = item.slice(index + matchedText.length);

    if (before) result.push(before);
    result.push(createNode(matchedText));
    if (after) result.push(after);

    inserted = true;
  }

  return result;
}
