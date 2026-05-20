import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  buildCandidateSymRefMap,
  extractPlainText,
  getSuggestedReferenceCandidateKey,
  SuggestedReference,
  SuggestedReferenceCandidate,
  suggestRefsForDefinition,
} from "@/server/symbolic-suggestions";
import { ExtractedItem } from "@/server/text-selection";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import { FtmlStatement } from "@/types/ftml.types";
import { useEffect, useState } from "react";

type SniffyCatalog = Parameters<typeof suggestRefsForDefinition>[1];

type UseSniffyReferenceSuggestionsParams = {
  definitions: ExtractedItem[];
  catalog: SniffyCatalog;
  invalidate: () => Promise<unknown>;
  refetchDefinitions: () => Promise<ExtractedItem[]>;
};

export function useSniffyReferenceSuggestions({
  definitions,
  catalog,
  invalidate,
  refetchDefinitions,
}: UseSniffyReferenceSuggestionsParams) {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedReference[]>([]);
  const [suggestCandidateSymRefs, setSuggestCandidateSymRefs] = useState<
    Record<string, UnifiedSymbolicReference>
  >({});
  const [activeDefId, setActiveDefId] = useState<string | null>(null);
  const [activeDefText, setActiveDefText] = useState("");
  const [activeDefStatement, setActiveDefStatement] =
    useState<FtmlStatement | null>(null);

  useEffect(() => {
    if (!activeDefId) return;

    const activeDefinition = definitions.find(
      (definition) => definition.id === activeDefId,
    );
    if (!activeDefinition) return;

    setActiveDefStatement(activeDefinition.statement);
    setActiveDefText(extractPlainText(activeDefinition.statement));
  }, [activeDefId, definitions]);

  function setEmptySession() {
    setActiveDefText("");
    setActiveDefStatement(null);
    setSuggestions([]);
    setSuggestCandidateSymRefs({});
  }

  function loadSession(definitionId: string, definition: ExtractedItem) {
    const session = suggestRefsForDefinition(definition, catalog);

    setActiveDefText(extractPlainText(definition.statement));
    setActiveDefStatement(definition.statement);
    setSuggestions(session.suggestions);
    setSuggestCandidateSymRefs({
      ...buildCandidateSymRefMap(catalog, definitionId),
      ...session.candidateSymRefs,
    });
  }

  async function handleRecomputeReferences(definitionId: string) {
    const definition = definitions.find((e) => e.id === definitionId);
    if (!definition) return;

    setActiveDefId(definitionId);
    setActiveDefText(extractPlainText(definition.statement));
    setActiveDefStatement(definition.statement);
    setSuggestOpen(true);
    setSuggestLoading(true);

    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      loadSession(definitionId, definition);
    } finally {
      setSuggestLoading(false);
    }
  }

  async function reloadSniffySession(definitionId: string) {
    await invalidate();
    const updatedDefinitions = await refetchDefinitions();
    const updatedDef = updatedDefinitions.find(
      (definition) => definition.id === definitionId,
    );

    if (!updatedDef) {
      setEmptySession();
      return;
    }

    loadSession(definitionId, updatedDef);
  }

  async function handleAcceptSuggestion(
    s: SuggestedReference,
    candidate: SuggestedReferenceCandidate,
  ) {
    if (!activeDefId) return;
    const symRef =
      suggestCandidateSymRefs[getSuggestedReferenceCandidateKey(candidate)];
    if (!symRef) return;

    await symbolicRef({
      data: {
        definitionId: activeDefId,
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
      await reloadSniffySession(activeDefId);
    } finally {
      setSuggestLoading(false);
    }
  }

  return {
    suggestOpen,
    setSuggestOpen,
    suggestLoading,
    suggestions,
    suggestCandidateSymRefs,
    activeDefId,
    activeDefText,
    activeDefStatement,
    handleRecomputeReferences,
    handleAcceptSuggestion,
    reloadSniffySession,
  };
}
