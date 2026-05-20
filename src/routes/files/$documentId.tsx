import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { DefinitionIdentityDialog } from "@/components/DefinitionFilePathDialog";
import { DocumentPagesPanel } from "@/components/DocumentPagesPanel";
import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { ExtractTextDialog } from "@/components/ExtractTextDialog";
import { LatexConfigModel } from "@/components/LatexConfigModel";
import { ReferenceSuggestionDialog } from "@/components/ReferenceSuggestionDialog";
import { SelectionPopup } from "@/components/SelectionPopup";
import { SemanticPanel } from "@/components/SemanticPanel";
import { SymbolicRef } from "@/components/SymbolicRef";
import { documentByIdQuery } from "@/queries/documentById";
import { documentPagesQuery } from "@/queries/documentPages";
import { queryClient } from "@/queryClient";
import { currentUser } from "@/server/auth/currentUser";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { normalizeSymRef, parseUri, ReplacePayload } from "@/server/parseUri";
import { DEFAULT_LLM_SYSTEM_PROMPT } from "@/server/prompt";
import {
  buildCandidateSymRefMap,
  buildStaticCatalog,
  extractPlainText,
  getSuggestedReferenceCandidateKey,
  SuggestedReference,
  SuggestedReferenceCandidate,
  suggestRefsForDefinition,
} from "@/server/symbolic-suggestions";
import {
  ActivePage,
  ExtractedItem,
  useExtractionActions,
  useTextSelection,
  useValidation,
} from "@/server/text-selection";
import { SymbolSearchResult } from "@/server/useSymbolSearch";
import {
  deleteDefinition,
  listDefinition,
} from "@/serverFns/extractDefinition.server";
import {
  getLlmSuggestions,
  getLlmSuggestionsByDocument,
} from "@/serverFns/llmSuggestion.server";
import { createSymbolDefiniendum } from "@/serverFns/symbol.server";
import { listStaticSymbolicCatalog } from "@/serverFns/symbolicCatalog.server";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import { updateDefinitionAst } from "@/serverFns/updateDefinition.server";
import { DefiniendumNode, FtmlStatement } from "@/types/ftml.types";
import { LlmSuggestion } from "@/types/llm.types";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Tabs,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconBrain,
  IconChevronLeft,
  IconChevronRight,
  IconFileAlert,
  IconFileText,
  IconList,
  IconPlus,
  IconRefresh,
  IconSparkles,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/files/$documentId")({
  loader: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) {
      throw redirect({ to: "/login" });
    }
    return null;
  },
  component: RouteComponent,
});

type FlattenedLlmSuggestion = {
  id: string;
  pageId: string;
  pageNumber: number;
  suggestion: LlmSuggestion;
};

function getLlmSuggestionId(pageId: string, suggestion: LlmSuggestion): string {
  return `llm-suggestion-${pageId}-${suggestion.startOffset}-${suggestion.endOffset}`;
}

function RouteComponent() {
  const navigate = useNavigate();
  const { documentId } = Route.useParams();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  const { data: document, isLoading: docLoading } = useQuery(
    documentByIdQuery(documentId),
  );

  const { data: pages = [], isLoading: pagesLoading } = useQuery(
    documentPagesQuery(documentId),
  );

  const { data: extracts = [] } = useQuery({
    queryKey: ["definitions", documentId],
    queryFn: () => listDefinition({ data: { documentId } }),
  });

  const { data: staticCatalog = [] } = useQuery({
    queryKey: ["static-symbolic-catalog"],
    queryFn: () => listStaticSymbolicCatalog(),
  });

  const [futureRepo, setFutureRepo] = useState("smglom/softeng");
  const [filePath, setFilePath] = useState("mod");
  const [fileName, setFileName] = useState("Software");
  const [language, setLanguage] = useState("en");
  const [definitionName, setDefinitionName] = useState("");
  const { validate, clearError } = useValidation();

  const [activePage, setActivePage] = useState<ActivePage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [mode, setMode] = useState<"SymbolicRef" | null>(null);
  const [conceptUri, setConceptUri] = useState<string>("");

  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [defExtractId, setDefExtractId] = useState<string | null>(null);
  const [defExtractText, setDefExtractText] = useState("");
  const [lockedByExtractId, setLockedByExtractId] = useState<string | null>(
    null,
  );

  const [latexConfigOpen, setLatexConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("document");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const [semanticPanelDefId, setSemanticPanelDefId] = useState<string | null>(
    null,
  );
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [pendingExtractText, setPendingExtractText] = useState("");
  const [isManualDefinitionCreate, setIsManualDefinitionCreate] =
    useState(false);
  const [definitionMetaEditOpen, setDefinitionMetaEditOpen] = useState(false);
  const [definitionMetaTarget, setDefinitionMetaTarget] =
    useState<ExtractedItem | null>(null);
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

  const { selection, popup, handleSelection, clearPopupOnly, clearAll } =
    useTextSelection();
  const { extractText, updateExtract } = useExtractionActions(documentId);
  const sniffyCatalog = useMemo(
    () => buildStaticCatalog(staticCatalog),
    [staticCatalog],
  );

  useEffect(() => {
    if (!activeDefId) return;

    const activeDefinition = extracts.find(
      (definition) => definition.id === activeDefId,
    );
    if (!activeDefinition) return;

    setActiveDefStatement(activeDefinition.statement);
    setActiveDefText(extractPlainText(activeDefinition.statement));
  }, [activeDefId, extracts]);

  const { data: llmSuggestions = {} } = useQuery({
    queryKey: ["llm-suggestions", documentId],
    queryFn: () => getLlmSuggestionsByDocument({ data: { documentId } }),
  });
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(false);
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

  async function runLlm(prompt: string) {
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
      setLlmEnabled(
        Object.values(result.suggestions).some((s) => s.length > 0),
      );
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
    void runLlmForUnextractedPages();
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

    setActivePage({ id: page.id, pageNumber: page.pageNumber });
    setIsManualDefinitionCreate(false);
    setPendingExtractText(
      Array.isArray(suggestion.text)
        ? suggestion.text.join(" ")
        : suggestion.text,
    );
    setExtractDialogOpen(true);
  }

  async function handleDeleteDefinition(id: string) {
    if (!confirm("Delete this extracted definition?")) return;

    await deleteDefinition({ data: { id } });
    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });

    if (lockedByExtractId === id) {
      setLockedByExtractId(null);
      setEditingId(null);
    }
  }

  function handleLeftSelection(pageId: string) {
    setLockedByExtractId(null);

    if (!lockedByExtractId) {
      if (!validate(futureRepo, filePath, fileName, language)) return;
    }

    handleSelection("left");

    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    setActivePage({
      id: page.id,
      pageNumber: page.pageNumber,
    });
    setIsManualDefinitionCreate(false);
  }

  function handleOpenSemanticPanel(definitionId: string) {
    setSemanticPanelDefId(definitionId);
    setSemanticPanelOpen(true);
  }

  async function handleRecomputeReferences(definitionId: string) {
    const def = extracts.find((e) => e.id === definitionId);
    if (!def) return;

    const text = extractPlainText(def.statement);
    setActiveDefId(definitionId);
    setActiveDefText(text);
    setActiveDefStatement(def.statement);
    setSuggestOpen(true);
    setSuggestLoading(true);

    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const session = suggestRefsForDefinition(def, sniffyCatalog);

      setSuggestions(session.suggestions);
      setSuggestCandidateSymRefs({
        ...buildCandidateSymRefMap(sniffyCatalog, definitionId),
        ...session.candidateSymRefs,
      });
    } finally {
      setSuggestLoading(false);
    }
  }

  async function reloadSniffySession(definitionId: string) {
    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
      refetchType: "none",
    });

    const updatedDefinitions = await queryClient.fetchQuery({
      queryKey: ["definitions", documentId],
      queryFn: () => listDefinition({ data: { documentId } }),
    });
    const updatedDef = updatedDefinitions.find(
      (definition) => definition.id === definitionId,
    );

    if (!updatedDef) {
      setActiveDefText("");
      setActiveDefStatement(null);
      setSuggestions([]);
      setSuggestCandidateSymRefs({});
      return;
    }

    const session = suggestRefsForDefinition(updatedDef, sniffyCatalog);

    setActiveDefText(extractPlainText(updatedDef.statement));
    setActiveDefStatement(updatedDef.statement);
    setSuggestions(session.suggestions);
    setSuggestCandidateSymRefs({
      ...buildCandidateSymRefMap(sniffyCatalog, definitionId),
      ...session.candidateSymRefs,
    });
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

  function handleEditDefinitionMeta(item: ExtractedItem) {
    setDefinitionMetaTarget(item);
    setFutureRepo(item.futureRepo);
    setFilePath(item.filePath);
    setFileName(item.fileName);
    setLanguage(item.language);
    setDefinitionMetaEditOpen(true);
  }

  async function handleDeleteNode(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ) {
    await updateDefinitionAst({
      data: {
        definitionId,
        operation: { kind: "removeSemantic", target },
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });
    setSemanticPanelOpen(false);
    setSemanticPanelDefId(null);
  }

  function handleRightSelection(extractId: string) {
    const extract = extracts.find((e) => e.id === extractId);
    if (!extract) return;

    setFutureRepo(extract.futureRepo);
    setFilePath(extract.filePath);
    setFileName(extract.fileName);
    setLanguage(extract.language);

    setLockedByExtractId(extractId);
    clearError("fileName");

    handleSelection("right", { extractId });
  }

  async function handleDefiniendumSubmit(
    params:
      | { mode: "CREATE"; symbolName: string; alias: string; symdecl: true }
      | { mode: "PICK_EXISTING"; selectedSymbol: SymbolSearchResult },
  ) {
    if (!defExtractId) return;
    if (!validate(futureRepo, filePath, fileName, language)) return;

    if (editingNodeId) {
      let newUri: string;

      if (params.mode === "CREATE") {
        newUri = params.symbolName;
      } else if (params.selectedSymbol.source === "DB") {
        newUri = params.selectedSymbol.symbolName;
      } else {
        const parsed = parseUri(params.selectedSymbol.uri);
        newUri = parsed.conceptUri;
      }

      const isDeclared = params.mode === "CREATE";

      const payload: DefiniendumNode = {
        type: "definiendum",
        uri: newUri,
        content: [
          params.mode === "CREATE"
            ? params.alias || params.symbolName
            : params.selectedSymbol.source === "DB"
              ? params.selectedSymbol.symbolName
              : parseUri(params.selectedSymbol.uri).symbol,
        ],
        symdecl: isDeclared,
      };

      await updateDefinitionAst({
        data: {
          definitionId: defExtractId,
          operation: {
            kind: "replaceSemantic",
            target: { type: "definiendum", uri: editingNodeId },
            payload,
          },
        },
      });
    } else {
      if (params.mode === "CREATE") {
        await createSymbolDefiniendum({
          data: {
            definitionId: defExtractId,
            selectedText: defExtractText,
            startOffset: selection!.startOffset,
            endOffset: selection!.endOffset,
            symdecl: true,
            futureRepo: futureRepo.trim(),
            filePath: filePath.trim(),
            fileName: fileName.trim(),
            language: language.trim(),
            symbolName: params.symbolName,
            alias: params.alias || null,
          },
        });
      } else {
        if (params.selectedSymbol.source === "DB") {
          await createSymbolDefiniendum({
            data: {
              definitionId: defExtractId,
              selectedText: defExtractText,
              startOffset: selection!.startOffset,
              endOffset: selection!.endOffset,
              symdecl: false,
              futureRepo: futureRepo.trim(),
              filePath: filePath.trim(),
              fileName: fileName.trim(),
              language: language.trim(),
              symbolName: "",
              selectedSymbolSource: "DB",
              selectedSymbolId: params.selectedSymbol.id,
            },
          });
        } else {
          await createSymbolDefiniendum({
            data: {
              definitionId: defExtractId,
              selectedText: defExtractText,
              startOffset: selection!.startOffset,
              endOffset: selection!.endOffset,
              symdecl: false,
              futureRepo: futureRepo.trim(),
              filePath: filePath.trim(),
              fileName: fileName.trim(),
              language: language.trim(),
              symbolName: "",
              selectedSymbolSource: "MATHHUB",
              selectedSymbolUri: params.selectedSymbol.uri,
            },
          });
        }
      }

      await queryClient.invalidateQueries({
        queryKey: ["definitions", documentId],
      });
    }

    setEditingNodeId(null);
    setDefDialogOpen(false);
    setDefExtractId(null);
    setDefExtractText("");
    clearAll();
  }

  async function handleSaveSymbolicRef(symRef: UnifiedSymbolicReference) {
    if (!defExtractId) return;
    if (editingNodeId) {
      const { uri, text } = normalizeSymRef(symRef);

      await updateDefinitionAst({
        data: {
          definitionId: defExtractId,
          operation: {
            kind: "replaceSemantic",
            target: { type: "symref", uri: editingNodeId },
            payload: {
              type: "symref",
              uri,
              content: [text],
            },
          },
        },
      });
    } else {
      if (!selection) return;

      await symbolicRef({
        data: {
          definitionId: defExtractId,
          selection: {
            text: selection.text,
            startOffset: selection.startOffset,
            endOffset: selection.endOffset,
          },
          symRef,
        },
      });
    }

    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });
    setEditingNodeId(null);
    setMode(null);
    clearAll();
  }

  function handleOpenSymbolicRef(extractId: string) {
    if (!selection) return;

    setDefExtractId(extractId);
    setConceptUri(selection.text);
    setMode("SymbolicRef");

    clearPopupOnly();
  }

  function handleCloseSymbolicRefDialog() {
    setMode(null);
    setDefExtractId(null);
    clearAll();
  }

  async function handleReplaceNode(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
    payload: ReplacePayload,
  ) {
    const result = await updateDefinitionAst({
      data: {
        definitionId,
        operation: {
          kind: "replaceSemantic",
          target,
          payload,
        },
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });

    return result;
  }

  function handleToggleEdit(id: string) {
    setEditingId(editingId === id ? null : id);
  }

  async function handleUpdateExtract(id: string, statement: FtmlStatement) {
    await updateExtract(id, statement);
    setEditingId(null);
  }

  function handleOpenLatexConfig() {
    setLatexConfigOpen(true);
  }

  function handleCreateDefinition() {
    setActivePage(null);
    setPendingExtractText("");
    setDefinitionName("");
    setIsManualDefinitionCreate(true);
    setExtractDialogOpen(true);
  }

  async function handleExtractSubmit(editedText: string) {
    if (!document) return;
    if (!validate(futureRepo, filePath, fileName, language)) return;

    if (isManualDefinitionCreate) {
      await extractText({
        documentPageId: pages[0]?.id ?? null,
        pageNumber: null,
        text: editedText,
        futureRepo: document.futureRepo,
        filePath: document.filePath,
        fileName: definitionName.trim(),
        language: document.language,
      });
    } else {
      if (!activePage) return;

      await extractText({
        documentPageId: activePage.id,
        pageNumber: activePage.pageNumber,
        text: editedText,
        futureRepo: document.futureRepo,
        filePath: document.filePath,
        fileName: definitionName.trim(),
        language: document.language,
      });
    }

    setExtractDialogOpen(false);
    setPendingExtractText("");
    setDefinitionName("");
    setIsManualDefinitionCreate(false);
    clearAll();

    if (
      !isManualDefinitionCreate &&
      focusedSuggestionIndex !== null &&
      flattenedSuggestions.length > 0
    ) {
      focusSuggestion(
        Math.min(focusedSuggestionIndex + 1, flattenedSuggestions.length - 1),
      );
    }
  }

  async function handleLatexConfigSubmit(config: {
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  }) {
    const filteredDefinitions = extracts.filter(
      (e) =>
        e.futureRepo === config.futureRepo &&
        e.filePath === config.filePath &&
        e.fileName === config.fileName &&
        e.language === config.language,
    );

    navigate({
      to: "/create-latex",
      search: {
        documentId,
        definitionIds: filteredDefinitions.map((e) => e.id),
        futureRepo: config.futureRepo,
        filePath: config.filePath,
        fileName: config.fileName,
        language: config.language,
      },
    });

    setLatexConfigOpen(false);
  }

  if (docLoading || pagesLoading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" color="blue" />
          <Text size="sm" c="dimmed" fw={500}>
            Loading document…
          </Text>
        </Stack>
      </Center>
    );
  }

  if (!document) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <ThemeIcon size={56} radius="xl" color="red" variant="light">
            <IconFileAlert size={28} />
          </ThemeIcon>
          <Text size="lg" fw={600} c="red.7">
            Document not found
          </Text>
          <Text size="sm" c="dimmed">
            The document you're looking for doesn't exist or has been removed.
          </Text>
        </Stack>
      </Center>
    );
  }

  const pad = isMobile ? "xs" : isTablet ? "md" : "lg";
  const gap = isMobile ? "xs" : "md";
  const totalSuggestions = flattenedSuggestions.length;
  const hasAnySuggestions = totalSuggestions > 0;
  const focusedSuggestion =
    focusedSuggestionIndex !== null
      ? flattenedSuggestions[focusedSuggestionIndex]
      : null;
  const focusedSuggestionId = focusedSuggestion?.id ?? null;
  const suggestionCounter =
    focusedSuggestionIndex === null ? 1 : focusedSuggestionIndex + 1;
  const hasExtractedDefinitions = extracts.length > 0;

  const didIMissSomethingButton = hasExtractedDefinitions ? (
    <Tooltip
      label={
        canRunLlm
          ? "Check whether any definitions were missed"
          : "Document is loading…"
      }
      withArrow
      position="bottom"
    >
      <Button
        size="xs"
        variant="light"
        color="teal"
        leftSection={
          llmLoading ? (
            <Loader size={12} color="teal" />
          ) : (
            <IconBrain size={14} />
          )
        }
        loading={llmLoading}
        disabled={!canRunLlm}
        onClick={handleDidIMissSomething}
      >
        Did I miss something?
      </Button>
    </Tooltip>
  ) : null;

  const llmButtons = (
    <Group gap={6} wrap="nowrap">
      {/* <Tooltip
        label={
          canRunLlm
            ? "Analyse full document for definition spans"
            : "Document is loading…"
        }
        withArrow
        position="bottom"
      >
        <Button
          size="xs"
          variant="light"
          color="violet"
          leftSection={
            llmLoading ? (
              <Loader size={12} color="violet" />
            ) : (
              <IconBrain size={14} />
            )
          }
          loading={llmLoading}
          disabled={!canRunLlm}
          onClick={handleLlmSuggestion}
        >
          LLM Suggestion
        </Button>
      </Tooltip>

      <Tooltip
        label={
          hasAnySuggestions || pages.length > 0
            ? "Edit the prompt and recompute suggestions"
            : "Run LLM Suggestion first"
        }
        withArrow
        position="bottom"
      >
        <Button
          size="xs"
          variant="subtle"
          color="violet"
          leftSection={<IconRefresh size={13} />}
          disabled={llmLoading || pages.length === 0}
          onClick={handleOpenRecompute}
        >
          Recompute LLM
        </Button>
      </Tooltip> */}

      {hasAnySuggestions && (
        <>
          <Group gap={2} wrap="nowrap">
            <Tooltip label="Previous suggestion" withArrow position="bottom">
              <Button
                size="xs"
                variant="subtle"
                color="yellow"
                px={6}
                onClick={() => goToSuggestion("previous")}
              >
                <IconChevronLeft size={14} />
              </Button>
            </Tooltip>

            <Text size="xs" c="dimmed" miw={42} ta="center">
              {suggestionCounter} / {totalSuggestions}
            </Text>

            <Tooltip label="Next suggestion" withArrow position="bottom">
              <Button
                size="xs"
                variant="subtle"
                color="yellow"
                px={6}
                onClick={() => goToSuggestion("next")}
              >
                <IconChevronRight size={14} />
              </Button>
            </Tooltip>
          </Group>

          <Tooltip
            label={llmEnabled ? "Hide highlights" : "Show highlights"}
            withArrow
            position="bottom"
          >
            <Button
              size="xs"
              variant={llmEnabled ? "filled" : "outline"}
              color="yellow"
              leftSection={<IconSparkles size={13} />}
              onClick={() => setLlmEnabled((v) => !v)}
            >
              {totalSuggestions}
            </Button>
          </Tooltip>
        </>
      )}
    </Group>
  );

  return (
    <Box h="100%" p={pad} style={{ overflow: "hidden" }}>
      <Stack gap={gap} h="100%" style={{ overflow: "hidden" }}>
        {isMobile ? (
          <Paper
            flex={1}
            shadow="xs"
            withBorder
            radius="md"
            style={{
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Box
                px="sm"
                pt="xs"
                style={{
                  borderBottom: "1px solid var(--mantine-color-gray-2)",
                }}
              >
                <Tabs.List mb="xs">
                  <Tabs.Tab
                    value="document"
                    leftSection={<IconFileText size={15} />}
                    fw={500}
                  >
                    {document.filename}
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="extracts"
                    leftSection={<IconList size={15} />}
                    fw={500}
                    rightSection={
                      extracts.length > 0 ? (
                        <Badge size="xs" variant="filled" color="blue" circle>
                          {extracts.length}
                        </Badge>
                      ) : undefined
                    }
                  >
                    Extracts
                  </Tabs.Tab>
                </Tabs.List>

                {activeTab === "document" && <Box pb="xs">{llmButtons}</Box>}
                {activeTab === "extracts" && didIMissSomethingButton && (
                  <Box pb="xs">{didIMissSomethingButton}</Box>
                )}
              </Box>

              <Tabs.Panel
                value="document"
                pt="xs"
                style={{
                  flex: 1,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <DocumentPagesPanel
                  documentId={documentId}
                  pages={pages}
                  onSelection={handleLeftSelection}
                  llmSuggestions={llmSuggestions}
                  llmEnabled={llmEnabled}
                  focusedSuggestionId={focusedSuggestionId}
                  onLlmSuggestionClick={handleLlmSuggestionClick}
                />
              </Tabs.Panel>

              <Tabs.Panel
                value="extracts"
                pt="xs"
                style={{
                  flex: 1,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <ExtractedTextPanel
                  extracts={extracts}
                  editingId={editingId}
                  selectedId={lockedByExtractId}
                  onUpdate={handleUpdateExtract}
                  onDelete={handleDeleteDefinition}
                  onSelection={handleRightSelection}
                  onToggleEdit={handleToggleEdit}
                  onOpenSemanticPanel={handleOpenSemanticPanel}
                  onRecomputeReferences={handleRecomputeReferences}
                  onEditDefinitionMeta={handleEditDefinitionMeta}
                />
              </Tabs.Panel>
            </Tabs>
          </Paper>
        ) : (
          <Flex
            gap={isTablet ? "md" : "lg"}
            style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
            direction={isTablet ? "column" : "row"}
          >
            <Paper
              flex={isTablet ? undefined : 1}
              shadow="xs"
              withBorder
              radius="md"
              style={{
                minHeight: isTablet ? "50%" : undefined,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Group
                px="md"
                py="sm"
                gap="xs"
                style={{
                  borderBottom: "1px solid var(--mantine-color-gray-2)",
                  flexWrap: "nowrap",
                }}
              >
                <IconFileText size={16} color="var(--mantine-color-blue-6)" />
                <Text size="sm" fw={600} c="gray.7" style={{ flexShrink: 0 }}>
                  {document.filename}
                </Text>
                <Badge
                  size="xs"
                  variant="light"
                  color="gray"
                  style={{ flexShrink: 0 }}
                >
                  {pages.length} {pages.length === 1 ? "page" : "pages"}
                </Badge>
                <Box style={{ flex: 1 }} />

                {llmButtons}
              </Group>

              <Box style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <DocumentPagesPanel
                  documentId={documentId}
                  pages={pages}
                  onSelection={handleLeftSelection}
                  llmSuggestions={llmSuggestions}
                  llmEnabled={llmEnabled}
                  focusedSuggestionId={focusedSuggestionId}
                  onLlmSuggestionClick={handleLlmSuggestionClick}
                />
              </Box>
            </Paper>

            <Paper
              w={isTablet ? undefined : 440}
              shadow="xs"
              withBorder
              radius="md"
              style={{
                minHeight: isTablet ? "50%" : undefined,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Group
                px="md"
                py="sm"
                gap="xs"
                style={{
                  borderBottom: "1px solid var(--mantine-color-gray-2)",
                }}
              >
                <IconList size={16} color="var(--mantine-color-teal-6)" />

                <Text size="sm" fw={600} c="gray.7">
                  Extracted Content
                </Text>

                {extracts.length > 0 && (
                  <Badge size="xs" variant="filled" color="teal" ml="auto">
                    {extracts.length}
                  </Badge>
                )}

                {didIMissSomethingButton}

                <Button
                  size="xs"
                  variant="subtle"
                  color="blue"
                  onClick={handleOpenLatexConfig}
                >
                  LaTeX
                </Button>

                <Tooltip label="Create new definition" withArrow>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="teal"
                    onClick={handleCreateDefinition}
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>

              <Box style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <ExtractedTextPanel
                  extracts={extracts}
                  editingId={editingId}
                  selectedId={lockedByExtractId}
                  onUpdate={handleUpdateExtract}
                  onDelete={handleDeleteDefinition}
                  onSelection={handleRightSelection}
                  onToggleEdit={handleToggleEdit}
                  onOpenSemanticPanel={handleOpenSemanticPanel}
                  onRecomputeReferences={handleRecomputeReferences}
                  onEditDefinitionMeta={handleEditDefinitionMeta}
                />
              </Box>
            </Paper>
          </Flex>
        )}
      </Stack>

      {popup && (
        <SelectionPopup
          popup={popup}
          onExtract={
            popup.source === "left"
              ? () => {
                  if (!selection) return;
                  setIsManualDefinitionCreate(false);
                  setPendingExtractText(selection.text);
                  setExtractDialogOpen(true);
                  clearAll();
                }
              : undefined
          }
          onDefiniendum={
            popup.source === "right"
              ? () => {
                  if (!selection) return;
                  const extract = extracts.find(
                    (e) => e.id === selection.extractId,
                  );
                  if (!extract) return;
                  setDefExtractId(extract.id);
                  setDefExtractText(selection.text);
                  setDefDialogOpen(true);
                }
              : undefined
          }
          onSymbolicRef={
            popup.source === "right"
              ? () => {
                  if (!selection) return;
                  const extract = extracts.find(
                    (e) => e.id === selection.extractId,
                  );
                  if (!extract) return;
                  handleOpenSymbolicRef(extract.id);
                }
              : undefined
          }
          onClose={clearAll}
        />
      )}

      {mode === "SymbolicRef" && (
        <SymbolicRef
          conceptUri={conceptUri}
          onSelect={handleSaveSymbolicRef}
          onClose={handleCloseSymbolicRefDialog}
        />
      )}

      <DefiniendumDialog
        opened={defDialogOpen}
        extractedText={defExtractText}
        onClose={() => setDefDialogOpen(false)}
        onSubmit={handleDefiniendumSubmit}
      />

      <LatexConfigModel
        opened={latexConfigOpen}
        onClose={() => setLatexConfigOpen(false)}
        onSubmit={handleLatexConfigSubmit}
        extracts={extracts}
      />

      <SemanticPanel
        opened={semanticPanelOpen}
        onClose={() => setSemanticPanelOpen(false)}
        definition={extracts.find((e) => e.id === semanticPanelDefId) ?? null}
        onReplaceNode={handleReplaceNode}
        onDeleteNode={handleDeleteNode}
      />

      <ExtractTextDialog
        opened={extractDialogOpen}
        initialText={pendingExtractText}
        definitionName={definitionName}
        setDefinitionName={setDefinitionName}
        filePath={`${futureRepo}/ ${filePath}`}
        onClose={() => {
          setExtractDialogOpen(false);
          setIsManualDefinitionCreate(false);
        }}
        onSubmit={handleExtractSubmit}
      />

      <DefinitionIdentityDialog
        opened={definitionMetaEditOpen}
        onClose={() => {
          setDefinitionMetaEditOpen(false);
          setDefinitionMetaTarget(null);
        }}
        definition={definitionMetaTarget}
        invalidateKey={["definitions", documentId]}
      />

      <ReferenceSuggestionDialog
        opened={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        definitionId={activeDefId ?? ""}
        definitionStatement={activeDefStatement}
        definitionText={activeDefText}
        suggestions={suggestions}
        catalog={sniffyCatalog}
        loading={suggestLoading}
        onAccept={handleAcceptSuggestion}
      />

      <Modal
        opened={recomputeDialogOpen}
        onClose={() => setRecomputeDialogOpen(false)}
        title={
          <Group gap="xs">
            <IconRefresh size={16} color="var(--mantine-color-violet-6)" />
            <Text fw={600} size="md">
              Recompute LLM Suggestions
            </Text>
          </Group>
        }
        size="lg"
        centered
        padding="lg"
        radius="md"
      >
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              System Prompt
            </Text>
            <Text size="xs" c="dimmed">
              This is the exact prompt sent to the LLM together with the full
              document text. Edit it to refine how definitions are detected,
              then click <strong>Recompute</strong>.
            </Text>
          </Stack>

          <Textarea
            value={recomputePromptDraft}
            onChange={(e) => setRecomputePromptDraft(e.currentTarget.value)}
            autosize
            minRows={10}
            styles={{
              input: {
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.6,
                backgroundColor: "var(--mantine-color-gray-0)",
              },
            }}
          />

          <Group justify="space-between" align="center">
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => setRecomputePromptDraft(DEFAULT_LLM_SYSTEM_PROMPT)}
            >
              Reset to default
            </Button>

            <Group gap="sm">
              <Button
                variant="default"
                onClick={() => setRecomputeDialogOpen(false)}
                disabled={llmLoading}
              >
                Cancel
              </Button>
              <Button
                leftSection={
                  llmLoading ? <Loader size={12} /> : <IconRefresh size={14} />
                }
                loading={llmLoading}
                disabled={!recomputePromptDraft.trim() || pages.length === 0}
                onClick={handleRecomputeSubmit}
              >
                Recompute
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
