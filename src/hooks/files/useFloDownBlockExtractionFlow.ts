import { normalizeContentName } from "@/components/ExtractTextDialog";
import { statementHasDeclaredSymbol } from "@/hooks/useDraftSemanticAuthoring";
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
  createFloDownBlockWithDeclaredSymbol,
  declareCreatedSymbolDefiniendum,
} from "@/serverFns/createFloDownBlockWithDeclaredSymbol.server";
import { createMarkReference } from "@/serverFns/markReference.server";
import { findFloDownBlocksByIdentity } from "@/serverFns/extractFloDownBlock.server";
import { FtmlStatement } from "@/types/ftml.types";
import { ExtractBlockType } from "@/types/blockType";
import { DocumentPage } from "generated/prisma/browser";
import { useState } from "react";
import { FlattenedLlmSuggestion } from "@/hooks/files/useLlmFloDownBlockSuggestions";

type ExtractDialogMode = "definition" | "symbol-target";

export function useFloDownBlockExtractionFlow({
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
  identity,
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
  identity: { futureRepo: string; filePath: string; language: string };
  getSuggestionState: () => {
    flattenedSuggestions: FlattenedLlmSuggestion[];
    focusedSuggestionIndex: number | null;
    focusSuggestion: (index: number) => void;
  };
}) {
  const [activePage, setActivePage] = useState<ActivePage | null>(null);
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [pendingExtractText, setPendingExtractText] = useState("");
  const [paragraphFileName, setParagraphFileName] = useState("");
  const [extractDialogMode, setExtractDialogMode] =
    useState<ExtractDialogMode>("definition");
  const [symbolName, setSymbolName] = useState("");
  const [extractBlockType, setExtractBlockType] = useState<ExtractBlockType>("definition");
  const [createdSymbolTarget, setCreatedSymbolTarget] =
    useState<CreatedSymbolTarget | null>(null);
  const [isManualDefinitionCreate, setIsManualDefinitionCreate] =
    useState(false);
  const [markReferenceDialogOpen, setMarkReferenceDialogOpen] = useState(false);
  const [markReferenceText, setMarkReferenceText] = useState("");
  const [markReferenceSaving, setMarkReferenceSaving] = useState(false);
  const [isMarkReferenceDefinitionFlow, setIsMarkReferenceDefinitionFlow] =
    useState(false);
  const [semanticEnabled, setSemanticEnabled] = useState(false);
  const [duplicateFloDownBlocks, setDuplicateFloDownBlocks] = useState<Awaited<ReturnType<typeof findFloDownBlocksByIdentity>>>([]);
  const [pendingDuplicateSubmit, setPendingDuplicateSubmit] = useState<{
    text: string; blockType: ExtractBlockType; statement?: FtmlStatement;
  } | null>(null);
  const { extractText } = useExtractionActions(documentId);

  function resetExtractState() {
    setExtractDialogOpen(false);
    setPendingExtractText("");
    setParagraphFileName("");
    setExtractDialogMode("definition");
    setSymbolName("");
    setExtractBlockType("definition");
    setIsManualDefinitionCreate(false);
    setIsMarkReferenceDefinitionFlow(false);
    setSemanticEnabled(false);
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
    setExtractBlockType("definition");
    setIsManualDefinitionCreate(false);
  }

  function handleCreateDefinition() {
    setActivePage(null);
    setPendingExtractText("");
    setParagraphFileName("");
    setExtractDialogMode("definition");
    setSymbolName("");
    setExtractBlockType("definition");
    setIsManualDefinitionCreate(true);
    setIsMarkReferenceDefinitionFlow(false);
    setSemanticEnabled(false);
    setExtractDialogOpen(true);
  }

  function handleCreateSymbolTargetFloDownBlock(conceptUri: string) {
    const normalizedName = normalizeContentName(conceptUri);
    setActivePage(null);
    setPendingExtractText(conceptUri);
    setParagraphFileName(normalizedName);
    setSymbolName(conceptUri);
    setCreatedSymbolTarget(null);
    setExtractDialogMode("symbol-target");
    setExtractBlockType("definition");
    setIsManualDefinitionCreate(true);
    setIsMarkReferenceDefinitionFlow(false);
    setSemanticEnabled(false);
    setExtractDialogOpen(true);
  }

  function handleOpenSelectionExtract() {
    if (!selection) return;
    setExtractDialogMode("definition");
    setSymbolName("");
    setExtractBlockType("definition");
    setIsManualDefinitionCreate(false);
    setIsMarkReferenceDefinitionFlow(false);
    setSemanticEnabled(false);
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
    setExtractBlockType("definition");
    setIsManualDefinitionCreate(false);
    setIsMarkReferenceDefinitionFlow(false);
    setSemanticEnabled(false);
    setPendingExtractText(text);
    setExtractDialogOpen(true);
  }

  async function performExtractSubmit({
    text: editedText,
    blockType,
    statement,
  }: {
    text: string;
    blockType: ExtractBlockType;
    statement?: FtmlStatement;
  }) {
    if (!document) return;
    if (!validateIdentity()) return;

    const isSymbolTargetCreate =
      isManualDefinitionCreate && extractDialogMode === "symbol-target";

    if (isManualDefinitionCreate) {
      if (extractDialogMode === "symbol-target") {
        const created = await createFloDownBlockWithDeclaredSymbol({
          data: {
            documentId,
            documentPageId: pages[0]?.id ?? null,
            pageNumber: null,
            blockType,
            paragraphFileName: paragraphFileName.trim(),
            originalText: editedText,
            statement,
            symbolName: symbolName.trim(),
            futureRepo: identity.futureRepo,
            filePath: identity.filePath,
            language: identity.language,
          },
        });

        await queryClient.invalidateQueries({
          queryKey: ["floDownBlocks", documentId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["symbol-search-db"],
        });

        if (isMarkReferenceDefinitionFlow) {
          setCreatedSymbolTarget(null);
        } else if (statementHasDeclaredSymbol(statement, symbolName.trim())) {
          setCreatedSymbolTarget(null);
        } else {
          setCreatedSymbolTarget(created);
        }
      } else {
        await extractText({
          documentPageId: pages[0]?.id ?? null,
          pageNumber: null,
          blockType,
          text: editedText,
          statement,
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: paragraphFileName.trim(),
          language: identity.language,
        });
      }
    } else {
      if (!activePage) return;

      await extractText({
        documentPageId: activePage.id,
        pageNumber: activePage.pageNumber,
        blockType,
        text: editedText,
        statement,
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        fileName: paragraphFileName.trim(),
        language: identity.language,
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

  async function handleExtractSubmit(input: {
    text: string;
    blockType: ExtractBlockType;
    statement?: FtmlStatement;
  }) {
    if (!document || !validateIdentity()) return;
    const matches = await findFloDownBlocksByIdentity({
      data: {
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        fileName: paragraphFileName.trim(),
        language: identity.language,
      },
    });
    if (matches.length) {
      setDuplicateFloDownBlocks(matches);
      setPendingDuplicateSubmit(input);
      return;
    }
    await performExtractSubmit(input);
  }

  async function confirmDuplicateCreation() {
    if (!pendingDuplicateSubmit) return;
    const input = pendingDuplicateSubmit;
    setDuplicateFloDownBlocks([]);
    setPendingDuplicateSubmit(null);
    await performExtractSubmit(input);
  }

  async function handleDeclareCreatedSymbolDefiniendum(selection: {
    selectedText: string;
    startOffset: number;
    endOffset: number;
  }) {
    if (!createdSymbolTarget) return;

    await declareCreatedSymbolDefiniendum({
      data: {
        floDownBlockId: createdSymbolTarget.floDownBlock.id,
        symbolId: createdSymbolTarget.symbol.id,
        selectedText: selection.selectedText,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocks", documentId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["symbol-search-db"],
    });

    setCreatedSymbolTarget(null);
  }

  async function handleMarkReferenceSubmit(
    params:
      | {
          mode: "CREATE";
          symbolName: string;
          symdecl: true;
        }
      | {
          mode: "PICK_EXISTING";
          selectedSymbol: SymbolSearchResult;
        },
  ) {
    if (!validateIdentity() || !document) return;
    const shouldOpenDefinitionDialog = params.mode === "CREATE";
    const createdSymbolName =
      params.mode === "CREATE" ? params.symbolName.trim() : "";

    const selectedText = markReferenceText || selection?.text;
    if (!selectedText || !activePage) return;

    setMarkReferenceSaving(true);
    try {
      await createMarkReference({
        data: {
          documentId,
          documentPageId: activePage.id,
          pageNumber: activePage.pageNumber,
          verbalization: selectedText,
          selectedSymbol:
            params.mode === "CREATE"
              ? {
                  source: "NEW",
                  symbolName: createdSymbolName,
                }
              : params.selectedSymbol.source === "DB"
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

      if (shouldOpenDefinitionDialog) {
        clearAll();
        setPendingExtractText(selectedText);
        setParagraphFileName(normalizeContentName(createdSymbolName));
        setSymbolName(createdSymbolName);
        setCreatedSymbolTarget(null);
        setExtractDialogMode("symbol-target");
        setExtractBlockType("definition");
        setIsManualDefinitionCreate(true);
        setIsMarkReferenceDefinitionFlow(true);
        setSemanticEnabled(false);
        setExtractDialogOpen(true);
      } else {
        clearAll();
      }
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
    paragraphFileName,
    setParagraphFileName,
    extractDialogMode,
    setExtractDialogMode,
    symbolName,
    setSymbolName,
    extractBlockType,
    setExtractBlockType,
    createdSymbolTarget,
    setCreatedSymbolTarget,
    isManualDefinitionCreate,
    isMarkReferenceDefinitionFlow,
    semanticEnabled,
    duplicateFloDownBlocks,
    pendingDuplicateSubmit,
    markReferenceDialogOpen,
    markReferenceText,
    markReferenceSaving,
    setIsManualDefinitionCreate,
    setSemanticEnabled,
    setDuplicateFloDownBlocks,
    handleLeftSelection,
    handleCreateDefinition,
    handleCreateSymbolTargetFloDownBlock,
    handleDeclareCreatedSymbolDefiniendum,
    handleOpenSelectionExtract,
    handleOpenMarkReference,
    handleCloseMarkReference,
    handleCloseExtractDialog,
    openSuggestionForExtraction,
    handleExtractSubmit,
    confirmDuplicateCreation,
    handleMarkReferenceSubmit,
  };
}
