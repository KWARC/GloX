import { openai } from "@/lib/openai";
import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import {
  buildPageOffsets,
  buildStoredPrompt,
  getFullTextHash,
  getStoredFullTextHash,
  getStoredSuggestionsBySuggestionId,
  mapGlobalSuggestionsToPages,
  resolveOffsets,
  validateSuggestions,
} from "@/server/llm";
import {
  LlmSuggestion,
  LlmSuggestionsInput,
  LlmSuggestionsOutput,
  RawPayload,
  RawSuggestion,
} from "@/types/llm.types";
import { createServerFn } from "@tanstack/react-start";

export const getLlmSuggestionsByDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { documentId: string }) => {
    if (!data.documentId) throw new Error("documentId is required");
    return data;
  })
  .handler(async ({ data }): Promise<Record<string, LlmSuggestion[]>> => {
    const user = await currentUser();
    if (!user.loggedIn) throw new Error("Unauthorized");

    const document = await prisma.document.findFirst({
      where: { id: data.documentId, userId: user.user.id },
    });
    if (!document) throw new Error("Document not found or access denied");
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
