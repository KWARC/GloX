import { openai } from "@/lib/openai";
import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { createServerFn } from "@tanstack/react-start";

export type LlmDefiniendum = {
  text: string[];
  label: string;
};

export type LlmDefiniendumInput = {
  definitionText: string;
  definitionId: string;
  documentPageId: string;
  pageNumber: number;
};

export type LlmDefiniendumOutput = {
  definienda: LlmDefiniendum[];
};

const DEFINIENDA_PROMPT = `
You are a precise definienda extraction engine.

INPUT:
A single technical or mathematical definition.

GOAL:
Identify the definienda being introduced or defined.

GOOD EXAMPLE:

Input:
"In a relational database management system (RDBMS), data are represented as tables: every datum is represented by a row (also called database record)."

Output:
{
  "definienda": [
    {
      "text": "relational database management system",
      "label": "definiendum"
    },
    {
      "text": "RDBMS",
      "label": "definiendum"
    },
    {
      "text": "tables",
      "label": "definiendum"
    },
    {
      "text": "row",
      "label": "definiendum"
    },
    {
      "text": "database record",
      "label": "definiendum"
    }
  ]
}

GOOD EXAMPLE:

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

RULES:
- Extract all definienda concepts
- Return multiple definienda whenever present
- Maximum 10 definienda
- Prefer noun phrases only
- Keep exact text span from input
- Do not rewrite
- Do not summarize
- Avoid verbs and long clauses
- Avoid explanations

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

    if (!data.definitionId) {
      throw new Error("definitionId is required");
    }

    return data;
  })
  .handler(async ({ data }): Promise<LlmDefiniendumOutput> => {
    console.log("SERVER INPUT DATA:", data);
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

      definienda = Array.isArray(parsed.definienda)
        ? parsed.definienda.map((item: any) => ({
            text: [item.text],
            label: item.label,
          }))
        : [];
    } catch {
      definienda = [];
    }

    await prisma.llmSuggestedDefinienda.deleteMany({
      where: {
        definitionId: data.definitionId,
      },
    });

    await prisma.llmSuggestedDefinienda.createMany({
      data: definienda.map((item) => ({
        definienda: item.text,
        definitionId: data.definitionId,
        prompt: DEFINIENDA_PROMPT,
      })),
    });

    return {
      definienda,
    };
  });
