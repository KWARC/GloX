export type FtmlContent = string | FtmlNode;

export function isNode(value: FtmlContent): value is FtmlNode {
  return typeof value !== "string";
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
export interface FtmlNode {
  type: string;
  content?: FtmlContent[];
  uri?: string;
  for_symbols?: string[];
}

export interface SymrefNode extends FtmlNode {
  type: "symref";
  uri: string;
  content: FtmlContent[];
}

export interface DefiniendumNode extends FtmlNode {
  type: "definiendum";
  uri: string;
  content: FtmlContent[];
  symdecl: boolean;
}

export interface DefiniensNode extends FtmlNode {
  type: "definiens";
  uri: string;
  content: FtmlContent[];
}

export interface DefinitionNode extends FtmlNode {
  type: "definition";
  for_symbols: string[];
  content: FtmlContent[];
}

export interface ParagraphNode extends FtmlNode {
  type: "paragraph";
  content: FtmlContent[];
}

export interface ThematicBreakNode extends FtmlNode {
  type: "thematicbreak";
}

export interface RootNode extends FtmlNode {
  type: "root";
  content: FtmlNode[];
}

export type FtmlRoot = RootNode | FtmlNode | FtmlNode[];

export type FtmlStatement = FtmlRoot;

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
