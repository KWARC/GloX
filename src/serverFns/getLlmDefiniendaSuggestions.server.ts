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

VISUAL UNDERSTANDING:
In many mathematical documents:

- Pink highlighted terms are usually DEFINIENDA
- Blue highlighted terms are usually SYMBOLS, references, linked concepts, or semantic links

Your task is to extract ONLY the definienda concepts.

EXAMPLE VISUAL INTERPRETATION:

Input:
"In a relational database management system (RDBMS), data are represented as tables: every datum is represented by a row (also called database record), which has a value for all columns (also called a column attribute or field). A null value is a special value used to denote a missing value."

Visual meaning:
- Pink terms (DEFINIENDA):
  relational database management system
  tables
  row
  database record
  value
  columns
  column attribute
  field
  null value

- Blue terms (SYMBOLS / REFERENCES):
  RDBMS
  data
  datum
  represented
  denote
  value

Correct Output:
{
  "definienda": [
    {
      "text": "relational database management system",
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
    },
    {
      "text": "value",
      "label": "definiendum"
    },
    {
      "text": "columns",
      "label": "definiendum"
    },
    {
      "text": "column attribute",
      "label": "definiendum"
    },
    {
      "text": "field",
      "label": "definiendum"
    },
    {
      "text": "null value",
      "label": "definiendum"
    }
  ]
}

RULES:
- Extract ALL definienda concepts
- Return multiple definienda whenever present
- Maximum 10 definienda
- Prefer noun phrases only
- Keep exact text span from input
- Do not rewrite
- Do not summarize
- Avoid verbs and long clauses
- Avoid actions or explanations
- Do NOT extract connector words
- Do NOT extract ordinary verbs

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

BAD EXAMPLE:

Input:
"This is done to make sure the instance load only once"

BAD Output:
{
  "definienda": [
    {
      "text": "instance load only once",
      "label": "definiendum"
    }
  ]
}

GOOD Output:
{
  "definienda": [
    {
      "text": "instance",
      "label": "definiendum"
    }
  ]
}

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
