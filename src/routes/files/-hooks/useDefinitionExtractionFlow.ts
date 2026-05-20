import { MyDocument } from "@/queries/document";
import {
  ActivePage,
  TextSelection,
  useExtractionActions,
} from "@/server/text-selection";
import { DocumentPage } from "generated/prisma/browser";
import { useState } from "react";
import { FlattenedLlmSuggestion } from "./useLlmDefinitionSuggestions";

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
    setIsManualDefinitionCreate(false);
  }

  function handleCreateDefinition() {
    setActivePage(null);
    setPendingExtractText("");
    setDefinitionName("");
    setIsManualDefinitionCreate(true);
    setExtractDialogOpen(true);
  }

  function handleOpenSelectionExtract() {
    if (!selection) return;
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
    setIsManualDefinitionCreate(false);
    setPendingExtractText(text);
    setExtractDialogOpen(true);
  }

  async function handleExtractSubmit(editedText: string) {
    if (!document) return;
    if (!validateIdentity()) return;

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

  return {
    activePage,
    extractDialogOpen,
    setExtractDialogOpen,
    pendingExtractText,
    definitionName,
    setDefinitionName,
    isManualDefinitionCreate,
    setIsManualDefinitionCreate,
    handleLeftSelection,
    handleCreateDefinition,
    handleOpenSelectionExtract,
    openSuggestionForExtraction,
    handleExtractSubmit,
  };
}
