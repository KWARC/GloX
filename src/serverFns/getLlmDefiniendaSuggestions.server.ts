import { openai } from "@/lib/openai";
import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

export type LlmDefiniendum = {
  text: string;
  label: string;
};

export type LlmDefiniendumInput = {
  definitionText: string;
  llmSuggestionId: string;
  documentPageId: string;
  pageNumber: number;
};

export type LlmDefiniendumOutput = {
  definienda: LlmDefiniendum[];
};

const DEFINIENDA_PROMPT = `
You are a precise definienda extraction engine.

INPUT:
A single technical definition.

GOAL:
Identify the primary definienda being defined.

RULES:
- Extract ONLY the exact technical concept being defined
- Usually return ONLY 1 definiendum
- Maximum 3 if multiple concepts are clearly defined
- Prefer short noun phrases
- Avoid verbs, explanations, actions, or descriptive clauses
- Avoid partial sentences
- Keep exact text span from input
- Do not rewrite or summarize

GOOD EXAMPLES:

Input:
"CTS ensures that data types defined in different languages are treated consistently."

Output:
{
  "definienda": [
    {
      "text": "CTS",
      "label": "definiendum"
    }
  ]
}

Input:
"Value types contain actual data while reference types contain pointers."

Output:
{
  "definienda": [
    {
      "text": "Value types",
      "label": "definiendum"
    },
    {
      "text": "reference types",
      "label": "definiendum"
    }
  ]
}

BAD EXAMPLE:

Input:
"This is done to make sure the instance load only once"

BAD Output:
"instance load only once"

GOOD Output:
"instance"

OUTPUT FORMAT:
{
  "definienda": [
    {
      "text": string,
      "label": "definiendum"
    }
  ]
}

IMPORTANT:
- Return STRICT JSON only
- No explanations
`;

export const getLlmDefiniendaSuggestions = createServerFn({
  method: "POST",
})
  .inputValidator((data: LlmDefiniendumInput) => {
    if (!data.definitionText?.trim()) {
      throw new Error("definitionText is required");
    }

    if (!data.llmSuggestionId) {
      throw new Error("llmSuggestionId is required");
    }

    return data;
  })
  .handler(async ({ data }): Promise<LlmDefiniendumOutput> => {
    const user = await currentUser();

    if (!user.loggedIn) {
      throw new Error("Unauthorized");
    }

    const response = await openai.responses.create({
      model: "gpt-5.4-nano",

      temperature: 0,

      text: {
        format: {
          type: "json_schema",

          name: "definienda_extraction",

          schema: {
            type: "object",

            additionalProperties: false,

            properties: {
              definienda: {
                type: "array",

                items: {
                  type: "object",

                  additionalProperties: false,

                  properties: {
                    text: {
                      type: "string",
                    },

                    label: {
                      type: "string",
                    },
                  },

                  required: ["text", "label"],
                },
              },
            },

            required: ["definienda"],
          },
        },
      },

      input: [
        {
          role: "system",
          content: DEFINIENDA_PROMPT,
        },

        {
          role: "user",
          content: data.definitionText,
        },
      ],
    });

    let definienda: LlmDefiniendum[] = [];

    try {
      const parsed = JSON.parse(response.output_text || "{}");

      definienda = Array.isArray(parsed.definienda) ? parsed.definienda : [];
    } catch {
      definienda = [];
    }

    await prisma.llmSuggestedDefinienda.deleteMany({
      where: {
        definitionId: data.llmSuggestionId,
      },
    });

    await prisma.llmSuggestedDefinienda.createMany({
      data: definienda.map((item) => ({
        definienda: item.text,
        definitionId: data.llmSuggestionId,
        prompt: DEFINIENDA_PROMPT,
      })),
    });

    return {
      definienda,
    };
  });
