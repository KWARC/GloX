import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
import { ReplacePayload } from "@/server/parseUri";
import { SymbolSearchResult } from "@/server/useSymbolSearch";
import { getDefinitionBySymbol } from "@/serverFns/symbol.server";
import { UpdateDefinitionAstResult } from "@/serverFns/updateDefinition.server";
import { FtmlStatement } from "@/types/ftml.types";

type SemanticIndex = ReturnType<typeof extractSemanticIndex>;

export type DefiniendumNode = SemanticIndex["definienda"][number];
export type SymrefNode = SemanticIndex["symbolicRefs"][number];

export type Definition = NonNullable<
  Awaited<ReturnType<typeof getDefinitionBySymbol>>
>;

export type DbSymbolResult = Extract<SymbolSearchResult, { source: "DB" }>;
export type MathhubResult = Extract<SymbolSearchResult, { source: "MATHHUB" }>;

export type SelectedNode =
  | { type: "definiendum"; uri: string }
  | { type: "symref"; uri: string }
  | null;

export type Mode =
  | { type: "definiendum"; selected: DefiniendumNode }
  | { type: "symref"; selected: SymrefNode };

export type SemanticDefinition = {
  id: string;
  statement: FtmlStatement;
  symbolicRefs?: {
    symbolicReference: { id: string; conceptUri: string };
  }[];
};

export type OnReplaceNode = (
  definitionId: string,
  target: { type: "definiendum" | "symref"; uri: string },
  payload: ReplacePayload,
) => Promise<UpdateDefinitionAstResult>;

export type OnDeleteNode = (
  definitionId: string,
  target: { type: "definiendum" | "symref"; uri: string },
) => void;
