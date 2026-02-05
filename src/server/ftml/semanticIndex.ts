import {
  FtmlContent,
  FtmlNode,
  FtmlRoot,
  normalizeToRoot,
} from "@/types/ftml.types";
import { extractTextContent } from "./astOperations";

export type DefiniendumInfo = {
  uri: string;
  text: string;
  definiendumId: string;
};

export type SymbolicRefInfo = {
  uri: string;
  text: string;
  symbolicRefId: string;
};

type SemanticAstNode = FtmlContent | FtmlContent[];

function walkAst(
  node: SemanticAstNode,
  acc: {
    definienda: { uri: string; text: string }[];
    symbolicRefs: { uri: string; text: string }[];
  },
) {
  if (Array.isArray(node)) {
    node.forEach((child) => walkAst(child, acc));
    return;
  }

  if (typeof node === "string") return;
  if (!node || typeof node !== "object") return;

  const ftmlNode = node as FtmlNode;

  if (ftmlNode.type === "definiendum" && ftmlNode.uri && ftmlNode.content) {
    acc.definienda.push({
      uri: ftmlNode.uri,
      text: extractTextContent(ftmlNode.content),
    });
  }
  if (ftmlNode.type === "symref" && ftmlNode.uri && ftmlNode.content) {
    acc.symbolicRefs.push({
      uri: ftmlNode.uri,
      text: extractTextContent(ftmlNode.content),
    });
  }

  if (Array.isArray(ftmlNode.content)) {
    ftmlNode.content.forEach((child) => walkAst(child, acc));
  }
}

export function extractSemanticIndex(
  statement: FtmlRoot,
  definition: {
    definienda?: { definiendum: { id: string; symbolName: string } }[];
    symbolicRefs?: { symbolicReference: { id: string; conceptUri: string } }[];
  },
): {
  definienda: DefiniendumInfo[];
  symbolicRefs: SymbolicRefInfo[];
} {
  const root = normalizeToRoot(statement);

  const collected = {
    definienda: [] as { uri: string; text: string }[],
    symbolicRefs: [] as { uri: string; text: string }[],
  };

  walkAst(root.content, collected);

  const definienda: DefiniendumInfo[] = collected.definienda.map((d) => {
    const match = definition.definienda?.find(
      (x) => `LOCAL:${x.definiendum.symbolName}` === d.uri,
    );
    if (!match) throw new Error(`Definiendum DB row not found for ${d.uri}`);
    return { ...d, definiendumId: match.definiendum.id };
  });

  const symbolicRefs: SymbolicRefInfo[] = collected.symbolicRefs.map((r) => {
    const match = definition.symbolicRefs?.find(
      (x) => x.symbolicReference.conceptUri === r.uri,
    );
    if (!match) throw new Error(`SymbolicRef DB row not found for ${r.uri}`);
    return { ...r, symbolicRefId: match.symbolicReference.id };
  });

  return { definienda, symbolicRefs };
}
