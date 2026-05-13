export type DefinitionCatalogSource = {
  id: string;
  name: string;
  canonicalForm: string;
  aliases: string[];
  symbolicUri: string;
};

export type CatalogEntry = {
  definitionId: string;
  terms: string[];
  patterns?: string[];
};

export type SymbolicOccurrence = {
  definitionId: string;
  pageId: string;
  startOffset: number;
  endOffset: number;
  matchedText: string;
  confidence: number;
};

export type SymbolicIndex = Record<string, SymbolicOccurrence[]>;
