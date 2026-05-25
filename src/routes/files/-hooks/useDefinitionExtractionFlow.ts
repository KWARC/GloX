import { MyDocument } from "@/queries/document";
import { queryClient } from "@/queryClient";
import {
  ActivePage,
  TextSelection,
  useExtractionActions,
} from "@/server/text-selection";
import {
  CreatedSymbolTarget,
  createDefinitionWithDeclaredSymbol,
  declareCreatedSymbolDefiniendum,
} from "@/serverFns/createDefinitionWithDeclaredSymbol.server";
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
  const [createdSymbolTarget, setCreatedSymbolTarget] =
    useState<CreatedSymbolTarget | null>(null);
  const [isManualDefinitionCreate, setIsManualDefinitionCreate] =
    useState(false);
  const { extractText } = useExtractionActions(documentId);

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
    setIsManualDefinitionCreate(false);
  }

  function handleCreateDefinition() {
    setActivePage(null);
    setPendingExtractText("");
    setDefinitionName("");
    setExtractDialogMode("definition");
    setSymbolName("");
    setIsManualDefinitionCreate(true);
    setExtractDialogOpen(true);
  }

  function handleCreateSymbolTargetDefinition(conceptUri: string) {
    setActivePage(null);
    setPendingExtractText(conceptUri);
    setDefinitionName(conceptUri);
    setSymbolName(conceptUri);
    setCreatedSymbolTarget(null);
    setExtractDialogMode("symbol-target");
    setIsManualDefinitionCreate(true);
    setExtractDialogOpen(true);
  }

  function handleOpenSelectionExtract() {
    if (!selection) return;
    setExtractDialogMode("definition");
    setSymbolName("");
    setIsManualDefinitionCreate(false);
    setPendingExtractText(selection.text);
    setExtractDialogOpen(true);
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
    setIsManualDefinitionCreate(false);
    setPendingExtractText(text);
    setExtractDialogOpen(true);
  }

  async function handleExtractSubmit(editedText: string) {
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
            definitionName: definitionName.trim(),
            definitionText: editedText,
            symbolName: symbolName.trim(),
            futureRepo: document.futureRepo,
            filePath: document.filePath,
            language: document.language,
          },
        });
        setCreatedSymbolTarget(created);

        await queryClient.invalidateQueries({
          queryKey: ["definitions", documentId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["symbol-search-db"],
        });
      } else {
        await extractText({
          documentPageId: pages[0]?.id ?? null,
          pageNumber: null,
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
    setExtractDialogMode("definition");
    setSymbolName("");
    setIsManualDefinitionCreate(false);
    if (!isSymbolTargetCreate) {
      clearAll();
    }

    const { flattenedSuggestions, focusedSuggestionIndex, focusSuggestion } =
      getSuggestionState();

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
    createdSymbolTarget,
    setCreatedSymbolTarget,
    isManualDefinitionCreate,
    setIsManualDefinitionCreate,
    handleLeftSelection,
    handleCreateDefinition,
    handleCreateSymbolTargetDefinition,
    handleDeclareCreatedSymbolDefiniendum,
    handleOpenSelectionExtract,
    openSuggestionForExtraction,
    handleExtractSubmit,
  };
}
