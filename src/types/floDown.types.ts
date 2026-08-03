/**
 * FTML AST types for GloX `FloDownBlock.statement` JSON.
 *
 * Canonical block/inline shapes come from `public/flodown/flodown.d.ts`.
 * This file re-exports those types and adds the GloX storage/draft deltas:
 * - `RootNode` / array envelope on `FloDownStatement`
 * - `FloDownContent` looseness during curation
 * - `DefinitionNode` without persisted `for_symbols`
 * - `DefiniendumNode.symdecl` (draft/UI; stripped before persist)
 */
/// <reference path="../../public/flodown/flodown.d.ts" />

// ---------------------------------------------------------------------------
// FloDown canonical types (internal building blocks)
// ---------------------------------------------------------------------------

type SymbolUri = wasm_bindgen.SymbolUri;
type FloDownInline = wasm_bindgen.FloDownInline;
type FloDownInlineInDefinition = wasm_bindgen.FloDownInlineInDefinition;
type FloDownBlock = wasm_bindgen.FloDownBlock;
type HeadingLevel = wasm_bindgen.HeadingLevel;

export type SymrefNode = Extract<FloDownInline, { type: "symref" }>;

type FloDownDefiniendum = Extract<
  FloDownInlineInDefinition,
  { type: "definiendum" }
>;

/**
 * GloX extension of FloDown `definiendum`.
 * `symdecl: true` declares a local symbol; `false` is reference-only.
 */
export type DefiniendumNode = FloDownDefiniendum & { symdecl: boolean };

// ---------------------------------------------------------------------------
// GloX deltas on FloDown blocks
// ---------------------------------------------------------------------------

/** Mixed inline / block content during curation transforms. */
export type FloDownContent = string | FloDownNode;

export type ParagraphNode = Omit<
  Extract<FloDownBlock, { type: "paragraph" }>,
  "content"
> & { content: FloDownContent[] };

type FloDownDefinition = Extract<FloDownBlock, { type: "definition" }>;

/** `for_symbols` is derived at export; not persisted in GloX. */
export type DefinitionNode = Omit<FloDownDefinition, "for_symbols" | "content"> & {
  for_symbols?: SymbolUri[];
  content: FloDownContent[];
};

/** FloDown blocks with GloX definition/paragraph looseness. */
export type FloDownStatementBlock =
  | Exclude<FloDownBlock, { type: "definition" } | { type: "paragraph" }>
  | DefinitionNode
  | ParagraphNode;

/**
 * Structural superset for AST tree walkers.
 * Prefer concrete node types when constructing AST nodes.
 */
export interface FloDownNode {
  type: string;
  content?: FloDownContent[];
  uri?: SymbolUri;
  for_symbols?: SymbolUri[];
  symdecl?: boolean;
  text?: string;
  language?: string;
  level?: HeadingLevel;
  lines?: FloDownStatementBlock[][];
  url?: string;
}

/** GloX-only: combines multiple blocks when merging FloDown blocks. */
export interface RootNode {
  type: "root";
  content: FloDownNode[];
}

/**
 * JSON persisted on `FloDownBlock.statement`.
 * Usually one block; may be wrapped in `root` or an array after merge.
 */
export type FloDownStatement = RootNode | FloDownNode | FloDownNode[];

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isNode(value: FloDownContent): value is FloDownNode {
  return typeof value !== "string";
}

export function isRootNode(node: FloDownNode): node is RootNode {
  return node.type === "root";
}

export function isDefinitionNode(node: FloDownNode): node is DefinitionNode {
  return node.type === "definition";
}

export function isParagraphNode(node: FloDownNode): node is ParagraphNode {
  return node.type === "paragraph";
}

export function isDefiniendumNode(node: FloDownNode): node is DefiniendumNode {
  return node.type === "definiendum";
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

export function normalizeToRoot(ast: FloDownStatement): RootNode {
  if (Array.isArray(ast)) {
    return { type: "root", content: ast };
  }

  if (ast.type === "root") {
    return ast as RootNode;
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
