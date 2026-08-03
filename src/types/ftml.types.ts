/**
 * FTML AST types for GloX `FloDownBlock.statement` JSON.
 *
 * Canonical block/inline shapes come from `public/flodown/flodown.d.ts`.
 * This file re-exports those types and adds the GloX storage/draft deltas:
 * - `RootNode` / array envelope on `FtmlStatement`
 * - `FtmlContent` looseness during curation
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
export type FtmlContent = string | FtmlNode;

export type ParagraphNode = Omit<
  Extract<FloDownBlock, { type: "paragraph" }>,
  "content"
> & { content: FtmlContent[] };

type FloDownDefinition = Extract<FloDownBlock, { type: "definition" }>;

/** `for_symbols` is derived at export; not persisted in GloX. */
export type DefinitionNode = Omit<FloDownDefinition, "for_symbols" | "content"> & {
  for_symbols?: SymbolUri[];
  content: FtmlContent[];
};

/** FloDown blocks with GloX definition/paragraph looseness. */
export type FtmlBlock =
  | Exclude<FloDownBlock, { type: "definition" } | { type: "paragraph" }>
  | DefinitionNode
  | ParagraphNode;

/**
 * Structural superset for AST tree walkers.
 * Prefer concrete node types when constructing AST nodes.
 */
export interface FtmlNode {
  type: string;
  content?: FtmlContent[];
  uri?: SymbolUri;
  for_symbols?: SymbolUri[];
  symdecl?: boolean;
  text?: string;
  language?: string;
  level?: HeadingLevel;
  lines?: FtmlBlock[][];
  url?: string;
}

/** GloX-only: combines multiple blocks when merging FloDown blocks. */
export interface RootNode {
  type: "root";
  content: FtmlNode[];
}

/**
 * JSON persisted on `FloDownBlock.statement`.
 * Usually one block; may be wrapped in `root` or an array after merge.
 */
export type FtmlRoot = RootNode | FtmlNode | FtmlNode[];
export type FtmlStatement = FtmlRoot;

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isNode(value: FtmlContent): value is FtmlNode {
  return typeof value !== "string";
}

export function isRootNode(node: FtmlNode): node is RootNode {
  return node.type === "root";
}

export function isDefinitionNode(node: FtmlNode): node is DefinitionNode {
  return node.type === "definition";
}

export function isParagraphNode(node: FtmlNode): node is ParagraphNode {
  return node.type === "paragraph";
}

export function isDefiniendumNode(node: FtmlNode): node is DefiniendumNode {
  return node.type === "definiendum";
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

export function normalizeToRoot(ast: FtmlRoot): RootNode {
  if (Array.isArray(ast)) {
    return { type: "root", content: ast };
  }

  if (ast.type === "root") {
    return ast as RootNode;
  }

  return { type: "root", content: [ast] };
}

export function unwrapRoot(root: RootNode): FtmlStatement {
  if (root.content.length === 1) {
    return root.content[0];
  }
  return root;
}

export function assertFtmlStatement(value: unknown): FtmlRoot {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid FTML statement: not an object");
  }
  return value as FtmlRoot;
}
