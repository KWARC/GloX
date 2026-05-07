export type LlmSuggestion = {
  text: string;
  startOffset: number;
  endOffset: number;
  label: string;
};

export type LlmSuggestionsInput = {
  documentId: string;
  systemPrompt: string;
};

export type LlmSuggestionsOutput = {
  suggestions: Record<string, LlmSuggestion[]>;
};

export type RawSuggestion = {
  text: string;
  label: string;
};

export type RawPayload = {
  suggestions: RawSuggestion[];
};

export type StoredSuggestion = {
  text: string;
  startOffset: number;
  endOffset: number;
  label: string;
};

export type PageOffset = {
  pageId: string;
  pageNumber: number;
  text: string;
  start: number;
  end: number;
};