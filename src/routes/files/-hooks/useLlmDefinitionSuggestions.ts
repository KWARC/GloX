import { queryClient } from "@/queryClient";
import { DEFAULT_LLM_SYSTEM_PROMPT } from "@/server/prompt";
import { ExtractedItem } from "@/server/text-selection";
import {
  getLlmSuggestions,
  getLlmSuggestionsByDocument,
} from "@/serverFns/llmSuggestion.server";
import { LlmSuggestion } from "@/types/llm.types";
import { useQuery } from "@tanstack/react-query";
import { DocumentPage } from "generated/prisma/browser";
import { useEffect, useMemo, useState } from "react";

export type FlattenedLlmSuggestion = {
  id: string;
  pageId: string;
  pageNumber: number;
  suggestion: LlmSuggestion;
};

export function getLlmSuggestionId(
  pageId: string,
  suggestion: LlmSuggestion,
): string {
  return `llm-suggestion-${pageId}-${suggestion.startOffset}-${suggestion.endOffset}`;
}

export function useLlmDefinitionSuggestions({
  documentId,
  pages,
  extracts,
  isMobile,
  setActiveTab,
  openSuggestionForExtraction,
}: {
  documentId: string;
  pages: DocumentPage[];
  extracts: ExtractedItem[];
  isMobile: boolean;
  setActiveTab: (tab: string | null) => void;
  openSuggestionForExtraction: (params: {
    page: DocumentPage;
    text: string;
  }) => void;
}) {
  const { data: llmSuggestions = {} } = useQuery({
    queryKey: ["llm-suggestions", documentId],
    queryFn: () => getLlmSuggestionsByDocument({ data: { documentId } }),
  });
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [llmSuggestionsDismissed, setLlmSuggestionsDismissed] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState<
    number | null
  >(null);
  const [llmPrompt, setLlmPrompt] = useState(DEFAULT_LLM_SYSTEM_PROMPT);
  const [recomputeDialogOpen, setRecomputeDialogOpen] = useState(false);
  const [recomputePromptDraft, setRecomputePromptDraft] = useState(llmPrompt);
  const canRunLlm = !llmLoading && pages.length > 0;

  const flattenedSuggestions = useMemo<FlattenedLlmSuggestion[]>(() => {
    const pageNumbersById = new Map(
      pages.map((page) => [page.id, page.pageNumber]),
    );

    return Object.entries(llmSuggestions)
      .flatMap(([pageId, suggestions]) => {
        const pageNumber = pageNumbersById.get(pageId);
        if (pageNumber === undefined) return [];

        return suggestions.map((suggestion) => ({
          id: getLlmSuggestionId(pageId, suggestion),
          pageId,
          pageNumber,
          suggestion,
        }));
      })
      .sort((a, b) =>
        a.pageNumber !== b.pageNumber
          ? a.pageNumber - b.pageNumber
          : a.suggestion.startOffset - b.suggestion.startOffset,
      );
  }, [llmSuggestions, pages]);

  const focusedSuggestion =
    focusedSuggestionIndex !== null
      ? flattenedSuggestions[focusedSuggestionIndex]
      : null;
  const focusedSuggestionId = focusedSuggestion?.id ?? null;

  useEffect(() => {
    if (flattenedSuggestions.length === 0) {
      setFocusedSuggestionIndex(null);
      return;
    }

    setFocusedSuggestionIndex((index) => {
      if (index === null) return index;
      return Math.min(index, flattenedSuggestions.length - 1);
    });
  }, [flattenedSuggestions.length]);

  useEffect(() => {
    if (
      !llmEnabled ||
      llmSuggestionsDismissed ||
      flattenedSuggestions.length === 0 ||
      focusedSuggestionIndex !== null
    ) {
      return;
    }

    setFocusedSuggestionIndex(0);
    scrollSuggestionIntoView(flattenedSuggestions[0].id);
  }, [
    flattenedSuggestions,
    focusedSuggestionIndex,
    llmEnabled,
    llmSuggestionsDismissed,
  ]);

  async function runLlm(prompt: string) {
    setLlmSuggestionsDismissed(false);
    setLlmLoading(true);
    try {
      await getLlmSuggestions({
        data: { documentId, systemPrompt: prompt },
      });

      await queryClient.invalidateQueries({
        queryKey: ["llm-suggestions", documentId],
      });
      setLlmEnabled(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "LLM request failed";
      alert(`LLM Suggestion failed: ${message}`);
    } finally {
      setLlmLoading(false);
    }
  }

  async function runLlmForUnextractedPages() {
    setLlmSuggestionsDismissed(false);
    const extractedPageNumbers = new Set(extracts.map((e) => e.pageNumber));
    const unextractedPageNumbers = pages
      .filter((page) => !extractedPageNumbers.has(page.pageNumber))
      .map((page) => page.pageNumber);

    if (unextractedPageNumbers.length === 0) {
      queryClient.setQueryData(["llm-suggestions", documentId], {});
      setLlmEnabled(false);
      return;
    }

    setLlmLoading(true);
    try {
      const result = await getLlmSuggestions({
        data: {
          documentId,
          systemPrompt: llmPrompt,
          pageNumbers: unextractedPageNumbers,
        },
      });

      queryClient.setQueryData(
        ["llm-suggestions", documentId],
        result.suggestions,
      );
      const hasSuggestions = Object.values(result.suggestions).some(
        (s) => s.length > 0,
      );
      setLlmEnabled(hasSuggestions);
      if (hasSuggestions) {
        setFocusedSuggestionIndex(0);
        if (isMobile) setActiveTab("document");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "LLM request failed";
      alert(`LLM Suggestion failed: ${message}`);
    } finally {
      setLlmLoading(false);
    }
  }

  function handleLlmSuggestion() {
    void runLlm(llmPrompt);
  }

  function handleDidIMissSomething() {
    if (flattenedSuggestions.length > 0) {
      setLlmSuggestionsDismissed(false);
      setLlmEnabled(true);
      if (isMobile) setActiveTab("document");
      focusSuggestion(focusedSuggestionIndex ?? 0);
      return;
    }

    setLlmSuggestionsDismissed(false);
    void runLlmForUnextractedPages();
  }

  function handleDismissSuggestions() {
    setLlmEnabled(false);
    setFocusedSuggestionIndex(null);
    setLlmSuggestionsDismissed(true);
  }

  function handleOpenRecompute() {
    setRecomputePromptDraft(llmPrompt);
    setRecomputeDialogOpen(true);
  }

  function handleRecomputeSubmit() {
    if (!pages.length) return;
    setLlmPrompt(recomputePromptDraft);
    setRecomputeDialogOpen(false);
    void runLlm(recomputePromptDraft);
  }

  function scrollSuggestionIntoView(suggestionId: string) {
    window.setTimeout(() => {
      const el = window.document.getElementById(suggestionId);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  }

  function focusSuggestion(index: number) {
    const suggestion = flattenedSuggestions[index];
    if (!suggestion) return;

    setFocusedSuggestionIndex(index);
    setLlmEnabled(true);
    if (isMobile) setActiveTab("document");
    scrollSuggestionIntoView(suggestion.id);
  }

  function goToSuggestion(direction: "previous" | "next") {
    if (flattenedSuggestions.length === 0) return;

    const lastIndex = flattenedSuggestions.length - 1;
    const nextIndex =
      focusedSuggestionIndex === null
        ? direction === "next"
          ? 0
          : lastIndex
        : direction === "next"
          ? Math.min(focusedSuggestionIndex + 1, lastIndex)
          : Math.max(focusedSuggestionIndex - 1, 0);

    focusSuggestion(nextIndex);
  }

  function handleLlmSuggestionClick(suggestion: LlmSuggestion, pageId: string) {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    const suggestionId = getLlmSuggestionId(pageId, suggestion);
    const suggestionIndex = flattenedSuggestions.findIndex(
      (entry) => entry.id === suggestionId,
    );
    if (suggestionIndex !== -1) {
      setFocusedSuggestionIndex(suggestionIndex);
    }

    openSuggestionForExtraction({
      page,
      text: Array.isArray(suggestion.text)
        ? suggestion.text.join(" ")
        : suggestion.text,
    });
  }

  return {
    llmSuggestions,
    llmLoading,
    llmEnabled,
    setLlmEnabled,
    llmSuggestionsDismissed,
    focusedSuggestionIndex,
    flattenedSuggestions,
    focusedSuggestionId,
    llmPrompt,
    recomputeDialogOpen,
    setRecomputeDialogOpen,
    recomputePromptDraft,
    setRecomputePromptDraft,
    canRunLlm,
    runLlm,
    runLlmForUnextractedPages,
    handleLlmSuggestion,
    handleDidIMissSomething,
    handleDismissSuggestions,
    handleOpenRecompute,
    handleRecomputeSubmit,
    goToSuggestion,
    focusSuggestion,
    handleLlmSuggestionClick,
  };
}
