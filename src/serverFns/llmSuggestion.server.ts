import { openai } from "@/lib/openai";
import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";

export const DEFAULT_LLM_SYSTEM_PROMPT = `You are a deterministic definition-span extractor for mathematical and scientific documents.

INPUT:
A FULL DOCUMENT as a single string (pages concatenated with "\n\n").

GOAL:
Return precise spans that define concepts.

DEFINITION CRITERIA (strict):
A span qualifies ONLY if it:
- explicitly introduces a term/symbol (e.g. “A group is…”, “Let X be…”, “We define…”)
- assigns meaning to a term
- is self-contained (can stand alone as a definition)

EXCLUDE:
- examples, remarks, proofs, corollaries
- references to previously defined terms
- partial sentences or fragments
- explanatory text that does not formally define

SPAN RULES:
- Extract exact text spans from the input document
- Prefer MAXIMAL spans (full definition block, not fragments)
- No overlaps
- Do not merge unrelated definitions
- If uncertain, SKIP

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "suggestions": [
    {
      "text": string,
      "label": string
    }
  ]
}

LABEL RULES:
- short canonical name of defined concept
- no sentences, no punctuation
- examples: "group", "vector space", "derivative"

VALIDATION BEFORE RETURN:
- ensure text is copied from the input document
- ensure no overlaps
- ensure spans are definition-grade (not commentary)

FAILSAFE:
If ANY uncertainty → exclude that span

EMPTY CASE:
{ "suggestions": [] }

DO NOT:
- explain
- add commentary
- include markdown
- return anything except JSON`;

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

type RawSuggestion = {
  text: string;
  label: string;
};

type RawPayload = {
  suggestions: RawSuggestion[];
};

type StoredSuggestion = {
  text: string;
  startOffset: number;
  endOffset: number;
  label: string;
};

type PageOffset = {
  pageId: string;
  pageNumber: number;
  text: string;
  start: number;
  end: number;
};

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

function resolveOffsets(
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

function validateSuggestions(
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

function buildPageOffsets(
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

function mapGlobalSuggestionsToPages(
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

async function getStoredSuggestionsBySuggestionId(
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

function getFullTextHash(fullDocText: string): string {
  return createHash("sha256").update(fullDocText).digest("hex");
}

function buildStoredPrompt(
  systemPrompt: string,
  fullDocTextHash: string,
): string {
  return JSON.stringify({ systemPrompt, fullDocTextHash });
}

function getStoredFullTextHash(customPrompt: string): string | null {
  try {
    const parsed = JSON.parse(customPrompt) as { fullDocTextHash?: unknown };
    return typeof parsed.fullDocTextHash === "string"
      ? parsed.fullDocTextHash
      : null;
  } catch {
    return null;
  }
}

export const getLlmSuggestionsByDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { documentId: string }) => {
    if (!data.documentId) throw new Error("documentId is required");
    return data;
  })
  .handler(async ({ data }): Promise<Record<string, LlmSuggestion[]>> => {
    const user = await currentUser();
    if (!user.loggedIn) throw new Error("Unauthorized");

    const latest = await prisma.llmSuggestion.findFirst({
      where: { documentId: data.documentId },
      orderBy: { createdAt: "desc" },
      include: {
        pages: {
          include: { documentPage: true },
          orderBy: { pageNumber: "asc" },
        },
      },
    });

    if (!latest) return {};

    const pages = await prisma.documentPage.findMany({
      where: { documentId: data.documentId },
      orderBy: { pageNumber: "asc" },
    });
    const fullDocText = pages.map((p) => p.text).join("\n\n");
    const storedHash = getStoredFullTextHash(latest.customPrompt);
    if (!storedHash || storedHash !== getFullTextHash(fullDocText)) return {};

    return getStoredSuggestionsBySuggestionId(latest.id);
  });

export const getLlmSuggestions = createServerFn({ method: "POST" })
  .inputValidator((data: LlmSuggestionsInput) => {
    if (!data.documentId) throw new Error("documentId is required");
    if (!data.systemPrompt?.trim()) throw new Error("systemPrompt is required");
    return data;
  })
  .handler(async ({ data }): Promise<LlmSuggestionsOutput> => {
    const user = await currentUser();
    if (!user.loggedIn) throw new Error("Unauthorized");

    const pages = await prisma.documentPage.findMany({
      where: { documentId: data.documentId },
      orderBy: { pageNumber: "asc" },
    });

    if (pages.length === 0) return { suggestions: {} };

    const fullDocText = pages.map((p) => p.text).join("\n\n");
    const fullDocTextHash = getFullTextHash(fullDocText);

    const response = await openai.responses.create({
      model: "gpt-5.4-nano",
      temperature: 0,
      text: {
        format: {
          type: "json_schema",
          name: "definition_spans",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    text: { type: "string" },
                    label: { type: "string" },
                  },
                  required: ["text", "label"],
                },
              },
            },
            required: ["suggestions"],
          },
        },
      },
      input: [
        {
          role: "system",
          content: data.systemPrompt,
        },
        {
          role: "user",
          content: fullDocText,
        },
      ],
    });

    const rawText = response.output_text;

    let raw: RawSuggestion[] = [];
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText) as RawPayload;
        raw = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];
      } catch {
        raw = [];
      }
    }

    console.log("RAW:", raw.length);
    const resolvedSuggestions = resolveOffsets(fullDocText, raw);
    const globalSuggestions = validateSuggestions(
      resolvedSuggestions,
      fullDocText,
    );
    console.log("VALID:", globalSuggestions.length);

    const pageOffsets = buildPageOffsets(pages);
    const perPage = mapGlobalSuggestionsToPages(globalSuggestions, pageOffsets);
    if (perPage.size === 0) {
      return { suggestions: {} };
    }

    const llmSuggestionId = await prisma.$transaction(async (tx) => {
      await tx.llmSuggestedDefinition.deleteMany({
        where: { llmSuggestion: { documentId: data.documentId } },
      });
      await tx.llmSuggestion.deleteMany({
        where: { documentId: data.documentId },
      });

      const llmSuggestion = await tx.llmSuggestion.create({
        data: {
          documentId: data.documentId,
          customPrompt: buildStoredPrompt(data.systemPrompt, fullDocTextHash),
        },
      });

      for (const { page, suggestions } of perPage.values()) {
        await tx.llmSuggestedDefinition.create({
          data: {
            llmSuggestionId: llmSuggestion.id,
            documentPageId: page.pageId,
            pageNumber: page.pageNumber,
            suggestions,
            definitionText: suggestions.map((s) => s.text).join("\n\n"),
          },
        });
      }

      return llmSuggestion.id;
    });

    const suggestions =
      await getStoredSuggestionsBySuggestionId(llmSuggestionId);

    return { suggestions };
  });
