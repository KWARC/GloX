import {
  FloDownStatement,
  isDefinitionNode,
  isRootNode,
  PersistedBlock,
} from "@/types/floDown.types";

/** Top-level FTML block types supported when creating curated content. */
export const EXTRACT_BLOCK_TYPES = ["definition", "paragraph"] as const;

export type ExtractBlockType = (typeof EXTRACT_BLOCK_TYPES)[number];

export function blockTypeLabel(blockType: ExtractBlockType): string {
  return blockType === "definition" ? "Definition" : "Paragraph";
}

function unwrapTopLevelNode(statement: FloDownStatement): PersistedBlock | null {
  if (Array.isArray(statement)) {
    return statement[0] ?? null;
  }

  if (typeof statement !== "object" || statement === null) {
    return null;
  }

  if (isRootNode(statement)) {
    return statement.content[0] ?? null;
  }

  return statement;
}

export function getTopLevelBlockType(statement: FloDownStatement): ExtractBlockType {
  const node = unwrapTopLevelNode(statement);
  if (node && isDefinitionNode(node)) {
    return "definition";
  }
  return "paragraph";
}

export function supportsDefinienda(statement: FloDownStatement): boolean {
  return getTopLevelBlockType(statement) === "definition";
}

export function buildStatementFromText(
  blockType: ExtractBlockType,
  text: string,
): FloDownStatement {
  const trimmed = text.trim();

  if (blockType === "paragraph") {
    return { type: "paragraph", content: [trimmed] };
  }

  return {
    type: "definition",
    for_symbols: [],
    content: [
      {
        type: "paragraph",
        content: [trimmed],
      },
    ],
  };
}
