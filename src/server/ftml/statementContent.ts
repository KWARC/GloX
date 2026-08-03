import {
  DefiniendumNode,
  DefinitionInnerParagraph,
  FloDownContent,
  FloDownStatement,
  hasInlineChildren,
  Inline,
  InlineInDefinition,
  isDefiniendumNode,
  normalizeToRoot,
  ParagraphNode,
  PersistedBlock,
  RootNode,
  SymrefNode,
} from "@/types/floDown.types";

export interface TextLocation {
  paragraphIndex: number;
  contentIndex: number;
  offset: number;
  occurrence: number;
}

const SEMANTIC_INLINE_TYPES = new Set(["symref", "definiendum", "definiens"]);

function isHttp(uri: string): boolean {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

export { isHttp };

/** Inner paragraph from a persisted block, or null if shape is unexpected. */
export function getInnerParagraph(
  block: PersistedBlock,
): ParagraphNode | DefinitionInnerParagraph | null {
  if (block.type === "paragraph") return block;
  const first = block.content[0];
  if (first?.type === "paragraph") return first;
  return null;
}

/** Top-level inline array for a block (paragraph or definition's inner paragraph). */
export function getInlineContent(block: PersistedBlock): FloDownContent[] {
  return getInnerParagraph(block)?.content ?? [];
}

export function setInlineContent(
  block: PersistedBlock,
  content: FloDownContent[],
): PersistedBlock {
  if (block.type === "paragraph") {
    return { ...block, content: content as Inline[] };
  }
  return {
    ...block,
    content: [{ type: "paragraph", content: content as InlineInDefinition[] }],
  };
}

export function mapInlineContent(
  block: PersistedBlock,
  fn: (content: FloDownContent[]) => FloDownContent[],
): PersistedBlock {
  return setInlineContent(block, fn(getInlineContent(block)));
}

/** Recurse only through inline `.content` arrays (bold, symref, etc.). */
export function mapInlines(
  content: FloDownContent[],
  fn: (item: FloDownContent) => FloDownContent,
): FloDownContent[] {
  return content.map((item) => {
    if (typeof item === "string") return fn(item);
    const mapped = fn(item);
    if (typeof mapped === "string" || !hasInlineChildren(mapped)) return mapped;
    return { ...mapped, content: mapInlines(mapped.content, fn) } as FloDownContent;
  });
}

export function walkInlines(
  content: FloDownContent[],
  visit: (item: FloDownContent) => void,
): void {
  for (const item of content) {
    visit(item);
    if (hasInlineChildren(item)) {
      walkInlines(item.content, visit);
    }
  }
}

export function extractTextContent(
  node: FloDownContent | FloDownContent[],
): string {
  if (Array.isArray(node)) {
    return node.map(extractTextContent).join("");
  }
  if (typeof node === "string") return node;
  if (hasInlineChildren(node)) return extractTextContent(node.content);
  return "";
}

export function extractPlainText(statement: FloDownStatement): string {
  const root = normalizeToRoot(statement);
  return root.content.map((block) => extractTextContent(getInlineContent(block))).join("");
}

export function collectDefiniendumUris(statement: FloDownStatement): string[] {
  const uris: string[] = [];
  const seen = new Set<string>();
  const root = normalizeToRoot(statement);

  for (const block of root.content) {
    walkInlines(getInlineContent(block), (item) => {
      if (!isDefiniendumNode(item)) return;
      const uri = item.uri?.trim();
      if (!uri || seen.has(uri)) return;
      seen.add(uri);
      uris.push(uri);
    });
  }

  return uris;
}

export function collectSymrefs(
  statement: FloDownStatement,
): { uri: string; text: string }[] {
  const refs: { uri: string; text: string }[] = [];
  const root = normalizeToRoot(statement);

  for (const block of root.content) {
    walkInlines(getInlineContent(block), (item) => {
      if (typeof item === "string" || item.type !== "symref") return;
      const symref = item as SymrefNode;
      if (!symref.uri) return;
      refs.push({
        uri: symref.uri,
        text: extractTextContent(symref.content ?? []),
      });
    });
  }

  return refs;
}

export function collectDefinienda(
  statement: FloDownStatement,
): { uri: string; text: string; symdecl: boolean }[] {
  const items: { uri: string; text: string; symdecl: boolean }[] = [];
  const root = normalizeToRoot(statement);

  for (const block of root.content) {
    walkInlines(getInlineContent(block), (item) => {
      if (!isDefiniendumNode(item)) return;
      items.push({
        uri: item.uri!,
        text: extractTextContent(item.content ?? []),
        symdecl: !!item.symdecl,
      });
    });
  }

  return items;
}

export function collectExternalSymbols(
  block: PersistedBlock,
  declaredOnThisRow: ReadonlySet<string> = new Set(),
): string[] {
  const external = new Set<string>();

  walkInlines(getInlineContent(block), (item) => {
    if (typeof item === "string") return;

    if (item.type === "symref" && item.uri && !isHttp(item.uri)) {
      external.add(item.uri);
    }

    if (
      isDefiniendumNode(item) &&
      item.uri &&
      !isHttp(item.uri) &&
      !declaredOnThisRow.has(item.uri)
    ) {
      external.add(item.uri);
    }
  });

  return Array.from(external);
}

export function findAllTextOccurrences(
  root: RootNode,
  searchText: string,
): TextLocation[] {
  const locations: TextLocation[] = [];

  root.content.forEach((block, paragraphIndex) => {
    const paragraphContent = getInlineContent(block);

    paragraphContent.forEach((item, contentIndex) => {
      if (typeof item !== "string") return;

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
    });
  });

  return locations;
}

export function replaceTextWithNode(
  root: RootNode,
  location: TextLocation,
  startOffset: number,
  endOffset: number,
  node: FloDownContent,
): RootNode {
  const cloned = structuredClone(root);
  const block = cloned.content[location.paragraphIndex];
  if (!block) throw new Error("Block not found");

  const paragraphContent = getInlineContent(block);
  const textNode = paragraphContent[location.contentIndex];

  if (typeof textNode !== "string") {
    throw new Error("Target node is not a text node");
  }

  const before = textNode.slice(0, startOffset);
  const after = textNode.slice(endOffset);

  const replacement: FloDownContent[] = [];
  if (before) replacement.push(before);
  replacement.push(node);
  if (after) replacement.push(after);

  paragraphContent.splice(location.contentIndex, 1, ...replacement);
  cloned.content[location.paragraphIndex] = setInlineContent(block, paragraphContent);

  return cloned;
}

/** True when target indexes a top-level string leaf (insertions only land there). */
export function pathTraversesSemanticNode(
  root: RootNode,
  targetPath: number[],
): boolean {
  const [blockIndex, contentIndex] = targetPath;
  const block = root.content[blockIndex];
  if (!block) return false;

  const item = getInlineContent(block)[contentIndex];
  return typeof item !== "string" && SEMANTIC_INLINE_TYPES.has(item.type);
}

export function walkEditableTextNodes(
  root: RootNode,
  visit: (text: string, plainOffset: number, nodePath: number[]) => void,
): void {
  let cursor = 0;

  root.content.forEach((block, blockIndex) => {
    getInlineContent(block).forEach((item, contentIndex) => {
      const nodePath = [blockIndex, contentIndex];

      if (typeof item === "string") {
        visit(item, cursor, nodePath);
        cursor += item.length;
        return;
      }

      if (SEMANTIC_INLINE_TYPES.has(item.type)) {
        cursor += extractTextContent(
          hasInlineChildren(item) ? item.content : [],
        ).length;
        return;
      }

      if (hasInlineChildren(item)) {
        walkInlines(item.content, (nested) => {
          if (typeof nested === "string") {
            visit(nested, cursor, nodePath);
            cursor += nested.length;
          }
        });
      }
    });
  });
}

export function getTopLevelBlocks(statement: FloDownStatement): PersistedBlock[] {
  return normalizeToRoot(statement).content;
}

export function isDeclaredDefiniendum(
  node: FloDownContent,
): node is DefiniendumNode & { symdecl: true; uri: string } {
  return (
    isDefiniendumNode(node) &&
    node.symdecl === true &&
    !!node.uri
  );
}

export function getStringContent(content: FloDownContent[] | undefined): string {
  return extractTextContent(content ?? []);
}
