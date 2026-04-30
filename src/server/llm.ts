import prisma from "@/lib/prisma";
import {
  LlmSuggestion,
  PageOffset,
  RawSuggestion,
  StoredSuggestion,
} from "@/types/llm.types";
import { createHash } from "node:crypto";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fuzzyFind(
  fullText: string,
  query: string,
  fromIndex: number,
  used: Set<number>,
): { startOffset: number; endOffset: number } | null {
  const parts = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (parts.length === 0) return null;

  const pattern = parts.join("\\s+");
  const regex = new RegExp(pattern, "g");
  regex.lastIndex = fromIndex;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(fullText))) {
    if (!used.has(match.index)) {
      return {
        startOffset: match.index,
        endOffset: match.index + match[0].length,
      };
    }

    regex.lastIndex = match.index + 1;
  }

  return null;
}

function isStoredSuggestion(value: unknown): value is StoredSuggestion {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<StoredSuggestion>;
  return (
    typeof candidate.startOffset === "number" &&
    Number.isInteger(candidate.startOffset) &&
    typeof candidate.endOffset === "number" &&
    Number.isInteger(candidate.endOffset) &&
    (candidate.text === undefined || typeof candidate.text === "string") &&
    typeof candidate.label === "string"
  );
}

function toClientSuggestions(
  pageText: string,
  suggestions: unknown,
): LlmSuggestion[] {
  if (!Array.isArray(suggestions)) return [];
  return suggestions
    .flatMap((s): LlmSuggestion[] => {
      if (!isStoredSuggestion(s)) return [];
      if (typeof s.startOffset !== "number" || typeof s.endOffset !== "number")
        return [];

      if (s.startOffset < 0 || s.endOffset > pageText.length) return [];
      if (s.startOffset >= s.endOffset) return [];

      const text = pageText.slice(s.startOffset, s.endOffset);
      if (text.length !== s.endOffset - s.startOffset) return [];
      const storedText = typeof s.text === "string" ? s.text : "";

      return [
        {
          text: storedText || text,
          startOffset: s.startOffset,
          endOffset: s.endOffset,
          label: s.label,
        },
      ];
    })
    .sort((a, b) =>
      a.startOffset !== b.startOffset
        ? a.startOffset - b.startOffset
        : b.endOffset - a.endOffset,
    );
}

export async function getStoredSuggestionsBySuggestionId(
  llmSuggestionId: string,
): Promise<Record<string, LlmSuggestion[]>> {
  const rows = await prisma.llmSuggestedDefinition.findMany({
    where: { llmSuggestionId },
    include: { documentPage: true },
    orderBy: { pageNumber: "asc" },
  });

  return rows.reduce<Record<string, LlmSuggestion[]>>((acc, row) => {
    acc[row.documentPageId] = toClientSuggestions(
      row.documentPage.text,
      row.suggestions,
    );
    return acc;
  }, {});
}

export function resolveOffsets(
  fullText: string,
  suggestions: RawSuggestion[],
): StoredSuggestion[] {
  const results: StoredSuggestion[] = [];
  const used = new Set<number>();

  for (const s of suggestions) {
    const text = typeof s.text === "string" ? s.text.trim() : "";
    if (!text) continue;

    let index = fullText.indexOf(text);
    while (index !== -1 && used.has(index)) {
      index = fullText.indexOf(text, index + 1);
    }

    const resolved =
      index === -1
        ? fuzzyFind(fullText, text, 0, used)
        : { startOffset: index, endOffset: index + text.length };

    if (!resolved) continue;

    results.push({
      text: fullText.slice(resolved.startOffset, resolved.endOffset),
      startOffset: resolved.startOffset,
      endOffset: resolved.endOffset,
      label: typeof s.label === "string" ? s.label : "",
    });
    used.add(resolved.startOffset);
  }

  return results;
}

export function validateSuggestions(
  raw: StoredSuggestion[],
  sourceText: string,
): StoredSuggestion[] {
  const valid = raw
    .flatMap((s): StoredSuggestion[] => {
      if (typeof s.startOffset !== "number" || typeof s.endOffset !== "number")
        return [];

      if (!Number.isInteger(s.startOffset) || !Number.isInteger(s.endOffset))
        return [];
      if (s.startOffset < 0 || s.endOffset > sourceText.length) return [];
      if (s.startOffset >= s.endOffset) return [];

      return [
        {
          text: sourceText.slice(s.startOffset, s.endOffset),
          startOffset: s.startOffset,
          endOffset: s.endOffset,
          label: typeof s.label === "string" ? s.label : "",
        },
      ];
    })
    .sort((a, b) =>
      a.startOffset !== b.startOffset
        ? a.startOffset - b.startOffset
        : b.endOffset - a.endOffset,
    );

  const nonOverlapping: StoredSuggestion[] = [];
  let cursor = 0;
  for (const suggestion of valid) {
    if (suggestion.startOffset < cursor) continue;
    nonOverlapping.push(suggestion);
    cursor = suggestion.endOffset;
  }

  return nonOverlapping;
}

export function buildPageOffsets(
  pages: { id: string; pageNumber: number; text: string }[],
): PageOffset[] {
  const pageSeparator = "\n\n";
  const offsets: PageOffset[] = [];
  let cursor = 0;

  for (const page of pages) {
    offsets.push({
      pageId: page.id,
      pageNumber: page.pageNumber,
      text: page.text,
      start: cursor,
      end: cursor + page.text.length,
    });
    cursor += page.text.length + pageSeparator.length;
  }

  return offsets;
}

export function mapGlobalSuggestionsToPages(
  suggestions: StoredSuggestion[],
  pageOffsets: PageOffset[],
): Map<string, { page: PageOffset; suggestions: StoredSuggestion[] }> {
  const byPage = new Map<
    string,
    { page: PageOffset; suggestions: StoredSuggestion[] }
  >();

  let pageIndex = 0;

  for (const suggestion of suggestions) {
    while (
      pageIndex < pageOffsets.length &&
      pageOffsets[pageIndex].end <= suggestion.startOffset
    ) {
      pageIndex += 1;
    }

    for (
      let i = pageIndex;
      i < pageOffsets.length && pageOffsets[i].start < suggestion.endOffset;
      i += 1
    ) {
      const page = pageOffsets[i];
      const globalStart = Math.max(suggestion.startOffset, page.start);
      const globalEnd = Math.min(suggestion.endOffset, page.end);

      if (globalStart >= globalEnd) continue;

      const localStart = globalStart - page.start;
      const localEnd = globalEnd - page.start;

      if (localStart < 0 || localEnd > page.text.length) continue;
      if (localStart >= localEnd) continue;

      const slice = page.text.slice(localStart, localEnd);
      if (slice.length !== localEnd - localStart) continue;

      const pageSuggestion: StoredSuggestion = {
        text: slice,
        startOffset: localStart,
        endOffset: localEnd,
        label: suggestion.label,
      };

      const entry = byPage.get(page.pageId) ?? { page, suggestions: [] };
      entry.suggestions.push(pageSuggestion);
      byPage.set(page.pageId, entry);
    }
  }

  for (const entry of byPage.values()) {
    entry.suggestions.sort((a, b) =>
      a.startOffset !== b.startOffset
        ? a.startOffset - b.startOffset
        : b.endOffset - a.endOffset,
    );
  }

  return byPage;
}

export function getFullTextHash(fullDocText: string): string {
  return createHash("sha256").update(fullDocText).digest("hex");
}

export function buildStoredPrompt(
  systemPrompt: string,
  fullDocTextHash: string,
): string {
  return JSON.stringify({ systemPrompt, fullDocTextHash });
}

export function getStoredFullTextHash(customPrompt: string): string | null {
  try {
    const parsed = JSON.parse(customPrompt) as { fullDocTextHash?: unknown };
    return typeof parsed.fullDocTextHash === "string"
      ? parsed.fullDocTextHash
      : null;
  } catch {
    return null;
  }
}
