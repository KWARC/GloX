import { openai } from "@/lib/openai";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

export const DEFAULT_LLM_SYSTEM_PROMPT = `You are a precise definition-span locator for mathematical and scientific text at the DOCUMENT level.

You are given the FULL DOCUMENT as a single concatenated string (multiple pages joined with "\\n\\n").

Your task:
Identify all spans that constitute a mathematical or scientific definition being introduced or explained.

A definition formally:
- introduces a new concept, term, or symbol
- assigns meaning to a term
- explains what something "is" in a formal or semi-formal way

Strict rules:
- Return ONLY a valid JSON object. No prose. No markdown.
- Output MUST follow the schema exactly.
- Offsets are GLOBAL across the ENTIRE input string.
- startOffset and endOffset are 0-based, endOffset is exclusive.
- Each "text" MUST be an EXACT substring of the full input:
  text === input.slice(startOffset, endOffset)
- Do NOT produce overlapping spans.
- Prefer the largest valid definition span (avoid fragments).
- Ignore examples, commentary, or informal explanations unless they explicitly define something.
- If no definitions exist, return: { "suggestions": [] }

Important:
The input may contain multiple pages merged together. Treat it as ONE continuous document.

Schema:
{
  "suggestions": [
    {
      "text": "<exact substring>",
      "startOffset": <number>,
      "endOffset": <number>,
      "label": "<short description of what is being defined>"
    }
  ]
}

Validation constraints:
- Verify every span before returning.
- If any span does not exactly match the substring at given offsets, discard it.
- Never guess offsets.`;

export type LlmSuggestion = {
  text: string;
  startOffset: number;
  endOffset: number;
  label: string;
};

export type LlmSuggestionsInput = {
  selectedText: string;
  systemPrompt: string;
};

export type LlmSuggestionsOutput = {
  suggestions: LlmSuggestion[];
};

type RawSuggestion = {
  text: string;
  startOffset: number;
  endOffset: number;
  label: string;
};

type RawPayload = {
  suggestions: RawSuggestion[];
};

function validateSuggestions(
  raw: RawSuggestion[],
  sourceText: string,
): LlmSuggestion[] {
  return raw.flatMap((s): LlmSuggestion[] => {
    if (typeof s.startOffset !== "number" || typeof s.endOffset !== "number")
      return [];

    if (s.startOffset < 0 || s.endOffset > sourceText.length) return [];
    if (s.startOffset >= s.endOffset) return [];

    const slice = sourceText.slice(s.startOffset, s.endOffset);

    return [
      {
        text: slice, // ← ALWAYS trust source, never model text
        startOffset: s.startOffset,
        endOffset: s.endOffset,
        label: typeof s.label === "string" ? s.label : "",
      },
    ];
  });
}

export const getLlmSuggestions = createServerFn({ method: "POST" })
  .inputValidator((data: LlmSuggestionsInput) => {
    if (!data.selectedText?.trim()) throw new Error("selectedText is required");
    if (!data.systemPrompt?.trim()) throw new Error("systemPrompt is required");
    return data;
  })
  .handler(async ({ data }): Promise<LlmSuggestionsOutput> => {
    const user = await currentUser();
    if (!user.loggedIn) throw new Error("Unauthorized");

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
                    startOffset: { type: "number" },
                    endOffset: { type: "number" },
                    label: { type: "string" },
                  },
                  required: ["text", "startOffset", "endOffset", "label"],
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
          content: data.selectedText,
        },
      ],
    });

    const rawText = response.output_text;
    console.log({ rawText });
    if (!rawText) return { suggestions: [] };

    let parsed: RawPayload;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return { suggestions: [] };
    }

    const raw = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

    const suggestions = validateSuggestions(raw, data.selectedText);
    console.log("Validated suggestions:", suggestions);

    return { suggestions };
  });
