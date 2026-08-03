import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
import { ReplacePayload } from "@/server/parseUri";
import { SymbolSearchResult } from "@/server/useSymbolSearch";
import { getFloDownBlockBySymbol } from "@/serverFns/symbol.server";
import { UpdateFloDownBlockAstResult } from "@/serverFns/updateFloDownBlock.server";
import { FloDownStatement } from "@/types/floDown.types";

type SemanticIndex = ReturnType<typeof extractSemanticIndex>;

export type DefiniendumNode = SemanticIndex["definienda"][number];
export type SymrefNode = SemanticIndex["symbolicRefs"][number];

export type FloDownBlockBySymbol = NonNullable<
  Awaited<ReturnType<typeof getFloDownBlockBySymbol>>
>;

export type DbSymbolResult = Extract<SymbolSearchResult, { source: "DB" }>;
export type MathhubResult = Extract<SymbolSearchResult, { source: "MATHHUB" }>;

export type SelectedNode =
  | { type: "definiendum"; uri: string }
  | { type: "symref"; uri: string }
  | null;

export type FloDownBlockSemantic = {
  id: string;
  statement: FloDownStatement;
  declaredSymbols?: string[];
};

export type OnReplaceNode = (
  floDownBlockId: string,
  target: { type: "definiendum" | "symref"; uri: string },
  payload: ReplacePayload,
) => Promise<UpdateFloDownBlockAstResult>;

export type OnDeleteNode = (
  floDownBlockId: string,
  target: { type: "definiendum" | "symref"; uri: string },
) => void;
