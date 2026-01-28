// Base FTML content types
export type FtmlContent = string | FtmlNode;

export interface FtmlNode {
  type: string;
  content?: FtmlContent[];
  uri?: string;
  for_symbols?: string[];
  [key: string]: any;
}

// Specific node types
export interface SymrefNode extends FtmlNode {
  type: 'symref';
  uri: string;
  content: FtmlContent[];
}

export interface DefiniendumNode extends FtmlNode {
  type: 'definiendum';
  uri: string;
  content: FtmlContent[];
}

export interface DefiniensNode extends FtmlNode {
  type: 'definiens';
  uri: string;
  content: FtmlContent[];
}

export interface DefinitionNode extends FtmlNode {
  type: 'definition';
  for_symbols: string[];
  content: FtmlContent[];
}

export interface ParagraphNode extends FtmlNode {
  type: 'paragraph';
  content: FtmlContent[];
}

export interface ThematicBreakNode extends FtmlNode {
  type: 'thematicbreak';
}

export interface RootNode extends FtmlNode {
  type: 'root';
  content: FtmlNode[];
}

// ✅ FIX 1: Explicit root modeling
export type FtmlRoot =
  | RootNode
  | FtmlNode
  | FtmlNode[];

// The database statement field stores this
export type FtmlStatement = FtmlRoot;

/**
 * ✅ FIX 1: Normalize any FTML input to root node
 * This MUST be called before rendering or processing
 */
export function normalizeToRoot(ast: FtmlRoot): RootNode {
  if (Array.isArray(ast)) {
    return { type: 'root', content: ast };
  }
  
  if (ast.type === 'root') {
    return ast as RootNode;
  }
  
  return { type: 'root', content: [ast] };
}

/**
 * Unwrap root if it contains a single node
 * Useful for storage optimization
 */
export function unwrapRoot(root: RootNode): FtmlStatement {
  if (root.content.length === 1) {
    return root.content[0];
  }
  return root;
}