export type DeclaredSymbolInfo = {
  symbolName: string;
  symbolUri: string;
  hasConfirmed: boolean;
  confirmedById: string | null;
  confirmedBy: string | null;
  alias?: string;
};

export type DeclaredSymbolDraft = {
  symbolName: string;
  symbolUri: string;
  alias?: string | null;
};
