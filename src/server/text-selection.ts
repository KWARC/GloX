import { queryClient } from "@/queryClient";
import { createDefiniendum } from "@/serverFns/definiendum.server";
import {
  createDefinition,
  updateDefinition,
} from "@/serverFns/extractDefinition.server";
import { FtmlStatement } from "@/types/ftml.types";
import { useState } from "react";

export interface PopupState {
  x: number;
  y: number;
  source: "left" | "right";
}
export type ActivePage = {
  id: string;
  pageNumber: number;
};

export type TextSelection = {
  text: string;
  extractId?: string;
};

export type ExtractedItem = {
  id: string;
  pageNumber: number;
  statement: FtmlStatement;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  definienda?: {
    definiendum: {
      id: string;
      symbolName: string;
      symdecl?:boolean;
    };
  }[];
  symbolicRefs?: {
    symbolicReference: {
      id: string;
      conceptUri: string;
    };
  }[];
};

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);

  function handleSelection(
    source: "left" | "right",
    options?: {
      extractId?: string;
      onLeftSelection?: (text: string) => void;
    },
  ) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const text = sel.toString().trim();
    if (!text) return;

    const rect = sel.getRangeAt(0).getBoundingClientRect();

    setSelection({
      text,
      extractId: options?.extractId,
    });

    setPopup({
      x: rect.right + window.scrollX + 8,
      y: rect.top + window.scrollY - 4,
      source,
    });

    if (source === "left" && options?.onLeftSelection) {
      options.onLeftSelection(text);
    }
  }

  function clearPopupOnly() {
    setPopup(null);
  }

  function clearAll() {
    setSelection(null);
    setPopup(null);
  }

  return {
    selection,
    popup,
    handleSelection,
    clearPopupOnly,
    clearAll,
  };
}

export function useExtractionActions(documentId: string) {
  async function extractText(params: {
    documentPageId: string;
    pageNumber: number;
    text: string;
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  }) {
    await createDefinition({
      data: {
        documentId,
        documentPageId: params.documentPageId,
        pageNumber: params.pageNumber,
        originalText: params.text,
        futureRepo: params.futureRepo,
        filePath: params.filePath,
        fileName: params.fileName,
        language: params.language,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });
  }

  async function saveDefiniendum(params: {
    definitionId: string;
    symbolName: string;
    alias?: string;
    selectedText: string;
    symbolDeclared: boolean;
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  }) {
    await createDefiniendum({
      data: {
        definitionId: params.definitionId,
        symbolName: params.symbolName,
        alias: params.alias,
        selectedText: params.selectedText,
        symbolDeclared: params.symbolDeclared,
        futureRepo: params.futureRepo,
        filePath: params.filePath,
        fileName: params.fileName,
        language: params.language,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definienda", documentId],
    });
  }

  async function updateExtract(id: string, statement: FtmlStatement) {
    await updateDefinition({
      data: { id, statement },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });
  }

  return { extractText, saveDefiniendum, updateExtract };
}

export interface ValidationErrors {
  futureRepo: string | null;
  filePath: string | null;
  fileName: string | null;
  language: string | null;
}

export function useValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({
    futureRepo: null,
    filePath: null,
    fileName: null,
    language: null,
  });

  function validate(
    futureRepo: string,
    filePath: string,
    fileName: string,
    language: string,
  ): boolean {
    const newErrors: ValidationErrors = {
      futureRepo: null,
      filePath: null,
      fileName: null,
      language: null,
    };

    if (!futureRepo.trim()) {
      newErrors.futureRepo = "Future Repo is required";
    }

    if (!filePath.trim()) {
      newErrors.filePath = "File Path is required";
    }

    if (!fileName.trim()) {
      newErrors.fileName = "File Name is required";
    }

    if (!language.trim()) {
      newErrors.language = "Language is required";
    }

    setErrors(newErrors);
    return !newErrors.futureRepo && !newErrors.filePath;
  }

  function clearError(field: keyof ValidationErrors) {
    setErrors((prev) => ({ ...prev, [field]: null }));
  }

  return { errors, validate, clearError };
}
