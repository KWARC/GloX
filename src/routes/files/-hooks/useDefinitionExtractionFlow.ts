import { normalizeContentName } from "@/components/ExtractTextDialog";
import { MyDocument } from "@/queries/document";
import { queryClient } from "@/queryClient";
import {
  ActivePage,
  TextSelection,
  useExtractionActions,
} from "@/server/text-selection";
import { SymbolSearchResult } from "@/server/useSymbolSearch";
import {
  CreatedSymbolTarget,
  createDefinitionWithDeclaredSymbol,
  declareCreatedSymbolDefiniendum,
} from "@/serverFns/createDefinitionWithDeclaredSymbol.server";
import {
  createLocalSymbol,
  createMarkReference,
} from "@/serverFns/markReference.server";
import { ParagraphKind } from "@/types/paragraphKind";
import { DocumentPage } from "generated/prisma/browser";
import { useState } from "react";
import { FlattenedLlmSuggestion } from "./useLlmDefinitionSuggestions";

type ExtractDialogMode = "definition" | "symbol-target";

export function useDefinitionExtractionFlow({
  documentId,
  document,
  pages,
  selection,
  handleSelection,
  clearPopupOnly,
  clearAll,
  lockedByExtractId,
  setLockedByExtractId,
  validateIdentity,
  getSuggestionState,
}: {
  documentId: string;
  document: MyDocument | undefined;
  pages: DocumentPage[];
  selection: TextSelection | null;
  handleSelection: (
    source: "left" | "right",
    options?: {
      extractId?: string;
      onLeftSelection?: (text: string) => void;
    },
  ) => void;
  clearPopupOnly: () => void;
  clearAll: () => void;
  lockedByExtractId: string | null;
  setLockedByExtractId: (id: string | null) => void;
  validateIdentity: () => boolean;
  getSuggestionState: () => {
    flattenedSuggestions: FlattenedLlmSuggestion[];
    focusedSuggestionIndex: number | null;
    focusSuggestion: (index: number) => void;
  };
}) {
  const [activePage, setActivePage] = useState<ActivePage | null>(null);
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [pendingExtractText, setPendingExtractText] = useState("");
  const [definitionName, setDefinitionName] = useState("");
  const [extractDialogMode, setExtractDialogMode] =
    useState<ExtractDialogMode>("definition");
  const [symbolName, setSymbolName] = useState("");
  const [extractKind, setExtractKind] = useState<ParagraphKind>("Definition");
  const [createdSymbolTarget, setCreatedSymbolTarget] =
    useState<CreatedSymbolTarget | null>(null);
  const [isManualDefinitionCreate, setIsManualDefinitionCreate] =
    useState(false);
  const [markReferenceDialogOpen, setMarkReferenceDialogOpen] = useState(false);
  const [markReferenceText, setMarkReferenceText] = useState("");
  const [markReferenceSaving, setMarkReferenceSaving] = useState(false);
  const [isMarkReferenceDefinitionFlow, setIsMarkReferenceDefinitionFlow] =
    useState(false);
  const { extractText } = useExtractionActions(documentId);

  function resetExtractState() {
    setExtractDialogOpen(false);
    setPendingExtractText("");
    setDefinitionName("");
    setExtractDialogMode("definition");
    setSymbolName("");
    setExtractKind("Definition");
    setIsManualDefinitionCreate(false);
    setIsMarkReferenceDefinitionFlow(false);
  }

  function resetMarkReferenceState() {
    setMarkReferenceDialogOpen(false);
    setMarkReferenceText("");
  }

  function handleLeftSelection(pageId: string) {
    setLockedByExtractId(null);

    if (!lockedByExtractId) {
      if (!validateIdentity()) return;
    }

    handleSelection("left");

    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    setActivePage({
      id: page.id,
      pageNumber: page.pageNumber,
    });
    setExtractDialogMode("definition");
    setSymbolName("");
    setExtractKind("Definition");
    setIsManualDefinitionCreate(false);
  }

  function handleCreateDefinition() {
    setActivePage(null);
    setPendingExtractText("");
    setDefinitionName("");
    setExtractDialogMode("definition");
    setSymbolName("");
    setExtractKind("Definition");
    setIsManualDefinitionCreate(true);
    setIsMarkReferenceDefinitionFlow(false);
    setExtractDialogOpen(true);
  }

  function handleCreateSymbolTargetDefinition(conceptUri: string) {
    const normalizedName = normalizeContentName(conceptUri);
    setActivePage(null);
    setPendingExtractText(conceptUri);
    setDefinitionName(normalizedName);
    setSymbolName(conceptUri);
    setCreatedSymbolTarget(null);
    setExtractDialogMode("symbol-target");
    setExtractKind("Definition");
    setIsManualDefinitionCreate(true);
    setIsMarkReferenceDefinitionFlow(false);
    setExtractDialogOpen(true);
  }

  function handleOpenSelectionExtract() {
    if (!selection) return;
    setExtractDialogMode("definition");
    setSymbolName("");
    setExtractKind("Definition");
    setIsManualDefinitionCreate(false);
    setIsMarkReferenceDefinitionFlow(false);
    setPendingExtractText(selection.text);
    setExtractDialogOpen(true);
    clearAll();
  }

  function handleOpenMarkReference() {
    if (!selection?.text || !activePage) return;

    setMarkReferenceText(selection.text);
    setMarkReferenceDialogOpen(true);
    clearPopupOnly();
  }

  function handleCloseMarkReference() {
    resetMarkReferenceState();
    clearAll();
  }

  function openSuggestionForExtraction({
    page,
    text,
  }: {
    page: DocumentPage;
    text: string;
  }) {
    setActivePage({ id: page.id, pageNumber: page.pageNumber });
    setExtractDialogMode("definition");
    setSymbolName("");
    setExtractKind("Definition");
    setIsManualDefinitionCreate(false);
    setIsMarkReferenceDefinitionFlow(false);
    setPendingExtractText(text);
    setExtractDialogOpen(true);
  }

  async function handleExtractSubmit({
    text: editedText,
    kind,
  }: {
    text: string;
    kind: ParagraphKind;
  }) {
    if (!document) return;
    if (!validateIdentity()) return;

    const isSymbolTargetCreate =
      isManualDefinitionCreate && extractDialogMode === "symbol-target";

    if (isManualDefinitionCreate) {
      if (extractDialogMode === "symbol-target") {
        const created = await createDefinitionWithDeclaredSymbol({
          data: {
            documentId,
            documentPageId: pages[0]?.id ?? null,
            pageNumber: null,
            kind,
            definitionName: definitionName.trim(),
            definitionText: editedText,
            symbolName: symbolName.trim(),
            futureRepo: document.futureRepo,
            filePath: document.filePath,
            language: document.language,
          },
        });

        await queryClient.invalidateQueries({
          queryKey: ["definitions", documentId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["symbol-search-db"],
        });

        if (isMarkReferenceDefinitionFlow) {
          setCreatedSymbolTarget(null);
        } else {
          setCreatedSymbolTarget(created);
        }
      } else {
        await extractText({
          documentPageId: pages[0]?.id ?? null,
          pageNumber: null,
          kind,
          text: editedText,
          futureRepo: document.futureRepo,
          filePath: document.filePath,
          fileName: definitionName.trim(),
          language: document.language,
        });
      }
    } else {
      if (!activePage) return;

      await extractText({
        documentPageId: activePage.id,
        pageNumber: activePage.pageNumber,
        kind,
        text: editedText,
        futureRepo: document.futureRepo,
        filePath: document.filePath,
        fileName: definitionName.trim(),
        language: document.language,
      });
    }

    const shouldAdvanceSuggestion =
      !isManualDefinitionCreate &&
      focusedSuggestionIndex !== null &&
      flattenedSuggestions.length > 0;

    resetExtractState();
    if (!isSymbolTargetCreate) {
      clearAll();
    }

    if (shouldAdvanceSuggestion) {
      focusSuggestion(
        Math.min(focusedSuggestionIndex + 1, flattenedSuggestions.length - 1),
      );
    }
  }

  async function handleDeclareCreatedSymbolDefiniendum(selection: {
    selectedText: string;
    startOffset: number;
    endOffset: number;
  }) {
    if (!createdSymbolTarget) return;

    await declareCreatedSymbolDefiniendum({
      data: {
        definitionId: createdSymbolTarget.definition.id,
        symbolId: createdSymbolTarget.symbol.id,
        selectedText: selection.selectedText,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["symbol-search-db"],
    });

    setCreatedSymbolTarget(null);
  }

  async function handleMarkReferenceSubmit(params: {
    mode: "CREATE";
    symbolName: string;
    verbalization: string;
    symdecl: true;
  } | { mode: "PICK_EXISTING"; selectedSymbol: SymbolSearchResult }) {
    const selectedText = markReferenceText || selection?.text;
    if (!selectedText || !activePage) return;

    setMarkReferenceSaving(true);
    try {
      if (params.mode === "CREATE") {
        const normalizedSymbolName = params.symbolName.trim();
        const createdSymbol = await createLocalSymbol({
          data: {
            symbolName: normalizedSymbolName,
            alias: null,
            futureRepo: document?.futureRepo ?? "",
            filePath: document?.filePath ?? "",
            fileName: normalizeContentName(normalizedSymbolName),
            language: document?.language ?? "en",
          },
        });

        await createMarkReference({
          data: {
            documentId,
            documentPageId: activePage.id,
            pageNumber: activePage.pageNumber,
            verbalization: selectedText,
            selectedSymbol: {
              source: "DB",
              id: createdSymbol.id,
              symbolName: createdSymbol.symbolName,
            },
          },
        });

        await queryClient.invalidateQueries({
          queryKey: ["symbol-search-db"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["mark-references", documentId],
        });

        resetMarkReferenceState();
        clearAll();
        setPendingExtractText(createdSymbol.symbolName);
        setDefinitionName(createdSymbol.fileName);
        setSymbolName(createdSymbol.symbolName);
        setExtractDialogMode("symbol-target");
        setExtractKind("Definition");
        setIsManualDefinitionCreate(true);
        setIsMarkReferenceDefinitionFlow(true);
        setExtractDialogOpen(true);
        return;
      }

      await createMarkReference({
        data: {
          documentId,
          documentPageId: activePage.id,
          pageNumber: activePage.pageNumber,
          verbalization: selectedText,
          selectedSymbol:
            params.selectedSymbol.source === "DB"
              ? {
                  source: "DB",
                  id: params.selectedSymbol.id,
                  symbolName: params.selectedSymbol.symbolName,
                }
              : {
                  source: "MATHHUB",
                  uri: params.selectedSymbol.uri,
                },
        },
      });

      await queryClient.invalidateQueries({
        queryKey: ["mark-references", documentId],
      });

      resetMarkReferenceState();
      clearAll();
    } finally {
      setMarkReferenceSaving(false);
    }
  }

  function handleCloseExtractDialog() {
    resetExtractState();
  }

  const { flattenedSuggestions, focusedSuggestionIndex, focusSuggestion } =
    getSuggestionState();

  return {
    activePage,
    extractDialogOpen,
    setExtractDialogOpen,
    pendingExtractText,
    definitionName,
    setDefinitionName,
    extractDialogMode,
    setExtractDialogMode,
    symbolName,
    setSymbolName,
    extractKind,
    setExtractKind,
    createdSymbolTarget,
    setCreatedSymbolTarget,
    isManualDefinitionCreate,
    isMarkReferenceDefinitionFlow,
    markReferenceDialogOpen,
    markReferenceText,
    markReferenceSaving,
    setIsManualDefinitionCreate,
    handleLeftSelection,
    handleCreateDefinition,
    handleCreateSymbolTargetDefinition,
    handleDeclareCreatedSymbolDefiniendum,
    handleOpenSelectionExtract,
    handleOpenMarkReference,
    handleCloseMarkReference,
    handleCloseExtractDialog,
    openSuggestionForExtraction,
    handleExtractSubmit,
    handleMarkReferenceSubmit,
  };
}
