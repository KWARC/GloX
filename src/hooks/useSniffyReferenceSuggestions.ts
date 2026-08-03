import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  buildCandidateSymRefMap,
  extractPlainText,
  getSuggestedReferenceCandidateKey,
  SuggestedReference,
  SuggestedReferenceCandidate,
  suggestRefsForFloDownBlock,
} from "@/server/symbolic-suggestions";
import { ExtractedItem } from "@/server/text-selection";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import { FtmlStatement } from "@/types/ftml.types";
import { useEffect, useState } from "react";

type SniffyCatalog = Parameters<typeof suggestRefsForFloDownBlock>[1];

type UseSniffyReferenceSuggestionsParams = {
  floDownBlocks: ExtractedItem[];
  catalog: SniffyCatalog;
  catalogLoading?: boolean;
  catalogError?: Error | null;
  retryCatalog?: () => Promise<void>;
  invalidate: () => Promise<unknown>;
  refetchFloDownBlocks: () => Promise<ExtractedItem[]>;
};

export function useSniffyReferenceSuggestions({
  floDownBlocks,
  catalog,
  catalogLoading = false,
  catalogError = null,
  retryCatalog,
  invalidate,
  refetchFloDownBlocks,
}: UseSniffyReferenceSuggestionsParams) {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedReference[]>([]);
  const [suggestCandidateSymRefs, setSuggestCandidateSymRefs] = useState<
    Record<string, UnifiedSymbolicReference>
  >({});
  const [activeFloDownBlockId, setActiveFloDownBlockId] = useState<string | null>(null);
  const [activeFloDownBlockText, setActiveFloDownBlockText] = useState("");
  const [activeFloDownBlockStatement, setActiveFloDownBlockStatement] =
    useState<FtmlStatement | null>(null);
  const [pendingFloDownBlockId, setPendingFloDownBlockId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!activeFloDownBlockId) return;

    const activeFloDownBlock = floDownBlocks.find(
      (floDownBlock) => floDownBlock.id === activeFloDownBlockId,
    );
    if (!activeFloDownBlock) return;

    setActiveFloDownBlockStatement(activeFloDownBlock.statement);
    setActiveFloDownBlockText(extractPlainText(activeFloDownBlock.statement));
  }, [activeFloDownBlockId, floDownBlocks]);

  function setEmptySession() {
    setActiveFloDownBlockText("");
    setActiveFloDownBlockStatement(null);
    setSuggestions([]);
    setSuggestCandidateSymRefs({});
  }

  function loadSession(floDownBlockId: string, floDownBlock: ExtractedItem) {
    const session = suggestRefsForFloDownBlock(floDownBlock, catalog);

    setActiveFloDownBlockText(extractPlainText(floDownBlock.statement));
    setActiveFloDownBlockStatement(floDownBlock.statement);
    setSuggestions(session.suggestions);
    setSuggestCandidateSymRefs({
      ...buildCandidateSymRefMap(catalog, floDownBlockId),
      ...session.candidateSymRefs,
    });
  }

  useEffect(() => {
    if (!pendingFloDownBlockId || catalogLoading || catalogError) return;

    const pendingFloDownBlock = floDownBlocks.find(
      (item) => item.id === pendingFloDownBlockId,
    );
    if (!pendingFloDownBlock) {
      setPendingFloDownBlockId(null);
      setSuggestLoading(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      loadSession(pendingFloDownBlockId, pendingFloDownBlock);
      setPendingFloDownBlockId(null);
      setSuggestLoading(false);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [catalog, catalogError, catalogLoading, floDownBlocks, pendingFloDownBlockId]);

  async function handleRecomputeReferences(floDownBlockId: string) {
    const floDownBlock = floDownBlocks.find((e) => e.id === floDownBlockId);
    if (!floDownBlock) return;

    setActiveFloDownBlockId(floDownBlockId);
    setActiveFloDownBlockText(extractPlainText(floDownBlock.statement));
    setActiveFloDownBlockStatement(floDownBlock.statement);
    setSuggestOpen(true);
    setSuggestLoading(true);

    setPendingFloDownBlockId(floDownBlockId);
  }

  async function handleRetryCatalog() {
    if (!pendingFloDownBlockId || !retryCatalog) return;
    setSuggestLoading(true);
    await retryCatalog();
  }

  async function reloadSniffySession(floDownBlockId: string) {
    await invalidate();
    const updatedFloDownBlocks = await refetchFloDownBlocks();
    const updatedDef = updatedFloDownBlocks.find(
      (floDownBlock) => floDownBlock.id === floDownBlockId,
    );

    if (!updatedDef) {
      setEmptySession();
      return;
    }

    loadSession(floDownBlockId, updatedDef);
  }

  async function handleAcceptSuggestion(
    s: SuggestedReference,
    candidate: SuggestedReferenceCandidate,
  ) {
    if (!activeFloDownBlockId) return;
    const symRef =
      suggestCandidateSymRefs[getSuggestedReferenceCandidateKey(candidate)];
    if (!symRef) return;

    await symbolicRef({
      data: {
        floDownBlockId: activeFloDownBlockId,
        selection: {
          text: s.text,
          startOffset: s.localStartOffset,
          endOffset: s.localEndOffset,
        },
        symRef,
      },
    });

    setSuggestLoading(true);
    try {
      await reloadSniffySession(activeFloDownBlockId);
    } finally {
      setSuggestLoading(false);
    }
  }

  return {
    suggestOpen,
    setSuggestOpen,
    suggestLoading,
    catalogError: catalogError?.message ?? null,
    suggestions,
    suggestCandidateSymRefs,
    activeFloDownBlockId,
    activeFloDownBlockText,
    activeFloDownBlockStatement,
    handleRecomputeReferences,
    handleRetryCatalog,
    handleAcceptSuggestion,
    reloadSniffySession,
  };
}
