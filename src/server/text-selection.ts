import { queryClient } from "@/queryClient";
import { createDefiniendum } from "@/serverFns/definiendum.server";
import {
  createExtractedText,
  updateExtractedText,
} from "@/serverFns/extractText.server";
import { useState } from "react";

export interface DocumentPage {
  id: string;
  pageNumber: number;
  text: string;
}

export interface PopupState {
  x: number;
  y: number;
  source: "left" | "right";
}

export interface ActivePage {
  id: string;
  pageNumber: number;
}

export interface ValidationErrors {
  futureRepo: string | null;
  filePath: string | null;
}

export interface ExtractedItem {
  id: string;
  pageNumber: number;
  statement: string;
}

export function useTextSelection() {
  const [selection, setSelection] = useState("");
  const [popup, setPopup] = useState<PopupState | null>(null);

  function handleSelection(
    source: "left" | "right",
    onLeftSelection?: (text: string) => void
  ) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const text = sel.toString().trim();
    if (!text) return;

    const rect = sel.getRangeAt(0).getBoundingClientRect();

    setSelection(text);
    setPopup({
      x: rect.right + window.scrollX + 8,
      y: rect.top + window.scrollY - 4,
      source,
    });

    if (source === "left" && onLeftSelection) {
      onLeftSelection(text);
    }
  }

  function clearPopup() {
    setSelection("");
    setPopup(null);
  }

  return { selection, popup, handleSelection, clearPopup };
}

export function useExtractionActions(documentId: string) {
  async function extractText(params: {
    documentPageId: string;
    pageNumber: number;
    text: string;
    futureRepo: string;
    filePath: string;
  }) {
    await createExtractedText({
      data: {
        documentId,
        documentPageId: params.documentPageId,
        pageNumber: params.pageNumber,
        originalText: params.text,
        statement: `\\begin{sdefinition}
            ${params.text}
          \\end{sdefinition}`,
        futureRepo: params.futureRepo,
        filePath: params.filePath,
      },
    } as any);

    await queryClient.invalidateQueries({
      queryKey: ["extracts", documentId],
    });
  }

  async function saveDefiniendum(params: {
    symbolName: string;
    futureRepo: string;
    filePath: string;
  }) {
    await createDefiniendum({
      data: {
        symbolName: params.symbolName,
        symbolDeclared: true,
        futureRepo: params.futureRepo,
        filePath: params.filePath,
      },
    } as any);

    await queryClient.invalidateQueries({
      queryKey: ["definienda", documentId],
    });
  }

  async function updateExtract(id: string, statement: string) {
    await updateExtractedText({
      data: { id, statement },
    } as any);

    await queryClient.invalidateQueries({
      queryKey: ["extracts", documentId],
    });
  }

  return { extractText, saveDefiniendum, updateExtract };
}

export function useValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({
    futureRepo: null,
    filePath: null,
  });

  function validate(futureRepo: string, filePath: string): boolean {
    const newErrors: ValidationErrors = {
      futureRepo: null,
      filePath: null,
    };

    if (!futureRepo.trim()) {
      newErrors.futureRepo = "Future Repo is required";
    }

    if (!filePath.trim()) {
      newErrors.filePath = "File Path is required";
    }

    setErrors(newErrors);
    return !newErrors.futureRepo && !newErrors.filePath;
  }

  function clearError(field: keyof ValidationErrors) {
    setErrors((prev) => ({ ...prev, [field]: null }));
  }

  return { errors, validate, clearError };
}

export function normalize(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export function buildDefiniendumMacro(symbol: string, alias?: string) {
  const s = normalize(symbol);
  const a = normalize(alias || "");

  if (a && a !== s) {
    return `\\definiendum{${s}}{${a}}`;
  }
  return `\\definame{${s}}`;
}

export function replaceAllUnwrapped(
  text: string,
  word: string,
  replacement: string
) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(
    `(?<!\\\\definame\\{|\\\\definiendum\\{)\\b${escaped}\\b`,
    "g"
  );

  return text.replace(regex, replacement);
}

