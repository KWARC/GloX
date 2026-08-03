export type FloDownBlockCatalogSource = {
  id: string;
  name: string;
  canonicalForm: string;
  aliases: string[];
  symbolicUri: string;
};

export type CatalogEntry = {
  floDownBlockId: string;
  terms: string[];
  patterns?: string[];
};

export type SymbolicOccurrence = {
  floDownBlockId: string;
  pageId: string;
  startOffset: number;
  endOffset: number;
  matchedText: string;
  confidence: number;
};

export type SymbolicIndex = Record<string, SymbolicOccurrence[]>;
