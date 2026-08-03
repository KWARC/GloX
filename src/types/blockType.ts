import {
  FtmlNode,
  FtmlStatement,
  isDefinitionNode,
  isNode,
  isRootNode,
} from "@/types/ftml.types";

/** Top-level FTML block types supported when creating curated content. */
export const EXTRACT_BLOCK_TYPES = ["definition", "paragraph"] as const;

export type ExtractBlockType = (typeof EXTRACT_BLOCK_TYPES)[number];

export function blockTypeLabel(blockType: ExtractBlockType): string {
  return blockType === "definition" ? "Definition" : "Paragraph";
}

function unwrapTopLevelNode(statement: FtmlStatement): FtmlNode | null {
  if (Array.isArray(statement)) {
    return statement.find(isNode) ?? null;
  }

  if (typeof statement !== "object" || statement === null) {
    return null;
  }

  if (isRootNode(statement)) {
    return statement.content.find(isNode) ?? null;
  }

  return statement;
}

export function getTopLevelBlockType(statement: FtmlStatement): ExtractBlockType {
  const node = unwrapTopLevelNode(statement);
  if (node && isDefinitionNode(node)) {
    return "definition";
  }
  return "paragraph";
}

export function supportsDefinienda(statement: FtmlStatement): boolean {
  return getTopLevelBlockType(statement) === "definition";
}

export function buildStatementFromText(
  blockType: ExtractBlockType,
  text: string,
): FtmlStatement {
  const trimmed = text.trim();

  if (blockType === "paragraph") {
    return { type: "paragraph", content: [trimmed] };
  }

  return {
    type: "definition",
    for_symbols: [],
    content: [{ type: "paragraph", content: [trimmed] }],
  };
}
