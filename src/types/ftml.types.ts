/**
 * FTML AST types for GloX `FloDownBlock.statement` JSON.
 *
 * Block and inline shapes mirror the canonical FloDown ontology in
 * `public/flodown/flodown.d.ts` (`FloDownBlock`, `FloDownInline`, …).
 *
 * GloX extensions (not in FloDown):
 * - `DefiniendumNode.symdecl` — distinguish symbol declaration vs reference-only
 * - `RootNode` — combine multiple paragraph-level blocks at export time
 *
 * Persistence stores one FloDown block (usually `{ type: "definition" }` or
 * `{ type: "paragraph" }`). Map to FloDown via `addElement()` at preview/export.
 */

/** FloDown `SymbolUri` — local short name or full MathHub HTTP URI. */
export type SymbolUri = string;

/** FloDown `HeadingLevel` (numeric enum in WASM bindings). */
export enum HeadingLevel {
  Section = 0,
  SubSection = 1,
  SubSubSection = 2,
  Paragraph = 3,
  SubParagraph = 4,
}

// ---------------------------------------------------------------------------
// Inlines (document level) — mirrors FloDown `Inline` / `FloDownInline`
// ---------------------------------------------------------------------------

export type MathInlineNode = { type: "math"; text: string };
export type CodeInlineNode = { type: "code"; text: string };
export type BoldInlineNode = { type: "bold"; content: Inline[] };
export type ItalicInlineNode = { type: "italic"; content: Inline[] };
export type HighlightInlineNode = { type: "highlight"; content: Inline[] };
export type StrikethroughInlineNode = {
  type: "strikethrough";
  content: Inline[];
};
export type SuperscriptInlineNode = { type: "superscript"; content: Inline[] };
export type SubscriptInlineNode = { type: "subscript"; content: Inline[] };
export type LinkInlineNode = { type: "link"; url: string; content: Inline[] };

export type SymrefNode = {
  type: "symref";
  uri: SymbolUri;
  content: Inline[];
};

export type FloDownInline =
  | MathInlineNode
  | CodeInlineNode
  | BoldInlineNode
  | ItalicInlineNode
  | HighlightInlineNode
  | StrikethroughInlineNode
  | SuperscriptInlineNode
  | SubscriptInlineNode
  | SymrefNode
  | LinkInlineNode;

/** FloDown `Inline` — plain text leaf or formatted / semantic inline. */
export type Inline = string | FloDownInline;

// ---------------------------------------------------------------------------
// Inlines inside definitions — mirrors FloDown `InlineInDefinition`
// ---------------------------------------------------------------------------

/**
 * GloX extension of FloDown `definiendum`.
 * `symdecl: true` declares a local symbol; `false` is reference-only.
 */
export type DefiniendumNode = {
  type: "definiendum";
  uri: SymbolUri;
  content: Inline[];
  symdecl: boolean;
};

export type DefiniensNode = {
  type: "definiens";
  uri: SymbolUri;
  content: Inline[];
};

export type FloDownInlineInDefinition =
  | MathInlineNode
  | CodeInlineNode
  | BoldInlineNode
  | ItalicInlineNode
  | HighlightInlineNode
  | StrikethroughInlineNode
  | SuperscriptInlineNode
  | SubscriptInlineNode
  | SymrefNode
  | LinkInlineNode
  | DefiniendumNode
  | DefiniensNode;

/** FloDown `InlineInDefinition`. */
export type InlineInDefinition = string | FloDownInlineInDefinition;

// ---------------------------------------------------------------------------
// Blocks — mirrors FloDown `FloDownBlock` / `FloDownBlockInDefinition`
// ---------------------------------------------------------------------------

export type BlockquoteNode = { type: "blockquote"; content: FtmlBlock[] };
export type ParagraphNode = {
  type: "paragraph";
  /**
   * FloDown: `Inline[]` at document level, `InlineInDefinition[]` inside definitions.
   * GloX pipelines still use the broader `FtmlContent[]` during curation transforms.
   */
  content: FtmlContent[];
};
export type BlockMathNode = { type: "blockmath"; text: string };
export type BlockCodeNode = {
  type: "blockcode";
  language: string;
  text: string;
};
export type HeadingNode = {
  type: "heading";
  level: HeadingLevel;
  content: Inline[];
};
export type NumberedListNode = {
  type: "numberedlist";
  lines: FtmlBlock[][];
};
export type BulletListNode = {
  type: "bulletlist";
  lines: FtmlBlock[][];
};
export type DefinitionNode = {
  type: "definition";
  for_symbols: SymbolUri[];
  /**
   * FloDown canonical: `FtmlBlockInDefinition[]`.
   * GloX pipelines still use the broader `FtmlContent[]` during curation transforms.
   */
  content: FtmlContent[];
};
export type ThematicBreakNode = { type: "thematicbreak" };

/** FloDown `FloDownBlock` — top-level document block. */
export type FtmlBlock =
  | BlockquoteNode
  | ParagraphNode
  | BlockMathNode
  | BlockCodeNode
  | HeadingNode
  | NumberedListNode
  | BulletListNode
  | DefinitionNode
  | ThematicBreakNode;

export type BlockquoteInDefinitionNode = {
  type: "blockquote";
  content: FtmlBlockInDefinition[];
};
export type ParagraphInDefinitionNode = {
  type: "paragraph";
  content: InlineInDefinition[];
};
export type BlockMathInDefinitionNode = { type: "blockmath"; text: string };
export type BlockCodeInDefinitionNode = {
  type: "blockcode";
  language: string;
  text: string;
};
export type HeadingInDefinitionNode = {
  type: "heading";
  level: HeadingLevel;
  content: InlineInDefinition[];
};
export type NumberedListInDefinitionNode = {
  type: "numberedlist";
  lines: FtmlBlockInDefinition[][];
};
export type BulletListInDefinitionNode = {
  type: "bulletlist";
  lines: FtmlBlockInDefinition[][];
};
export type ThematicBreakInDefinitionNode = { type: "thematicbreak" };

/** FloDown `FloDownBlockInDefinition` — block allowed inside a definition. */
export type FtmlBlockInDefinition =
  | BlockquoteInDefinitionNode
  | ParagraphInDefinitionNode
  | BlockMathInDefinitionNode
  | BlockCodeInDefinitionNode
  | HeadingInDefinitionNode
  | NumberedListInDefinitionNode
  | BulletListInDefinitionNode
  | ThematicBreakInDefinitionNode;

// ---------------------------------------------------------------------------
// GloX storage wrapper
// ---------------------------------------------------------------------------

/** GloX-only: combines multiple blocks when merging FloDown blocks. */
export interface RootNode {
  type: "root";
  content: FtmlNode[];
}

// ---------------------------------------------------------------------------
// Aliases & unions used across the app
// ---------------------------------------------------------------------------

/**
 * Structural superset for AST tree walkers.
 * All strict block/inline types above are assignable to this interface.
 * Prefer `FtmlBlock`, `Inline`, `InlineInDefinition`, etc. when constructing nodes.
 */
export interface FtmlNode {
  type: string;
  content?: FtmlContent[];
  uri?: SymbolUri;
  for_symbols?: SymbolUri[];
  /** GloX extension on `definiendum` nodes. */
  symdecl?: boolean;
  text?: string;
  language?: string;
  level?: HeadingLevel;
  lines?: FtmlBlock[][];
  url?: string;
}

/** Mixed inline / block content array (legacy helper for tree walkers). */
export type FtmlContent = string | FtmlNode;

/**
 * JSON persisted on `FloDownBlock.statement`.
 * Usually one `definition` block; may be wrapped in `root` or an array after merge.
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

export function isParagraphNode(
  node: FtmlNode,
): node is ParagraphNode | ParagraphInDefinitionNode {
  return node.type === "paragraph";
}

export function isDefiniendumNode(node: FtmlNode): node is DefiniendumNode {
  return node.type === "definiendum";
}

export function isDefiniensNode(node: FtmlNode): node is DefiniensNode {
  return node.type === "definiens";
}

export function isSymrefNode(node: FtmlNode): node is SymrefNode {
  return node.type === "symref";
}

export function isFtmlBlock(node: FtmlNode): node is FtmlBlock {
  return (
    node.type === "blockquote" ||
    node.type === "paragraph" ||
    node.type === "blockmath" ||
    node.type === "blockcode" ||
    node.type === "heading" ||
    node.type === "numberedlist" ||
    node.type === "bulletlist" ||
    node.type === "definition" ||
    node.type === "thematicbreak"
  );
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
