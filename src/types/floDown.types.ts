/**
 * Types for `FloDownBlock.statement` JSON and in-memory curation.
 *
 * Persistence: `PersistedBlock` + `declaredSymbols` column (FloDown shapes only).
 * Draft-only: `DefiniendumNode.symdecl`, `RootNode` — stripped before persist.
 * Export: `toExportDefinition` fills `for_symbols` from `declaredSymbols`.
 *
 * Canonical shapes: `public/flodown/flodown.d.ts`.
 */
/// <reference path="../../public/flodown/flodown.d.ts" />

type SymbolUri = wasm_bindgen.SymbolUri;
type FloDownBlock = wasm_bindgen.FloDownBlock;
type FloDownBlockInDefinition = wasm_bindgen.FloDownBlockInDefinition;

export type FloDownInline = wasm_bindgen.FloDownInline;
export type FloDownInlineInDefinition = wasm_bindgen.FloDownInlineInDefinition;
export type Inline = wasm_bindgen.Inline;
export type InlineInDefinition = wasm_bindgen.InlineInDefinition;

export type SymrefNode = Extract<FloDownInline, { type: "symref" }>;

type FloDownDefiniendum = Extract<
  FloDownInlineInDefinition,
  { type: "definiendum" }
>;

/** Draft/UI only — `symdecl` stripped before persist. Not part of `PersistedBlock`. */
export type DefiniendumNode = FloDownDefiniendum & { symdecl: boolean };

export type DefiniensNode = Extract<FloDownInlineInDefinition, { type: "definiens" }>;

/**
 * Union for inline helpers (`mapInlines`, `walkInlines`, …). May include draft
 * `DefiniendumNode` during editing; persisted blocks use `Inline` / `InlineInDefinition`.
 */
export type FloDownContent = Inline | InlineInDefinition | DefiniendumNode;

export type ParagraphNode = Extract<FloDownBlock, { type: "paragraph" }>;
export type DefinitionInnerParagraph = Extract<
  FloDownBlockInDefinition,
  { type: "paragraph" }
>;
export type DefinitionNode = Extract<FloDownBlock, { type: "definition" }>;

/** One curated block per DB row. */
export type PersistedBlock = ParagraphNode | DefinitionNode;

/** Block-level nodes in a statement tree. */
export type FloDownAstNode =
  | PersistedBlock
  | RootNode
  | DefinitionInnerParagraph
  | FloDownInline
  | FloDownInlineInDefinition;

/** In-memory envelope when merging or editing multiple blocks. */
export interface RootNode {
  type: "root";
  content: PersistedBlock[];
}

export type FloDownStatement = PersistedBlock | RootNode | PersistedBlock[];

export function isInlineNode(
  value: FloDownContent,
): value is Exclude<FloDownContent, string> {
  return typeof value !== "string";
}

/** @deprecated Use isInlineNode for content items or isPersistedBlock for blocks. */
export const isNode = isInlineNode;

export function isPersistedBlock(
  node: FloDownAstNode | FloDownStatement,
): node is PersistedBlock {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node.type === "paragraph" || node.type === "definition")
  );
}

export function hasInlineChildren(
  item: FloDownContent,
): item is Exclude<FloDownContent, string> & { content: FloDownContent[] } {
  return typeof item !== "string" && "content" in item && Array.isArray(item.content);
}

export function isRootNode(node: FloDownAstNode): node is RootNode {
  return node.type === "root";
}

export function isDefinitionNode(node: FloDownAstNode): node is DefinitionNode {
  return node.type === "definition";
}

export function isParagraphNode(
  node: FloDownAstNode,
): node is ParagraphNode | DefinitionInnerParagraph {
  return node.type === "paragraph";
}

export function isDefiniendumNode(
  node: FloDownContent,
): node is DefiniendumNode {
  return typeof node !== "string" && node.type === "definiendum";
}

export function isSymrefNode(node: FloDownContent): node is SymrefNode {
  return typeof node !== "string" && node.type === "symref";
}

export function normalizeToRoot(ast: FloDownStatement): RootNode {
  if (Array.isArray(ast)) {
    return { type: "root", content: ast };
  }

  if (ast.type === "root") {
    return ast;
  }

  return { type: "root", content: [ast] };
}

export function unwrapRoot(root: RootNode): FloDownStatement {
  if (root.content.length === 1) {
    return root.content[0];
  }
  return root;
}

export function assertFloDownStatement(value: unknown): FloDownStatement {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid FloDown statement: not an object");
  }
  return value as FloDownStatement;
}

export function toExportDefinition(
  definition: DefinitionNode,
  forSymbols: SymbolUri[],
): DefinitionNode {
  return {
    ...definition,
    for_symbols: forSymbols,
  };
}
