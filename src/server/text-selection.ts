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
  fileName: string | null;
  language: string | null;
}

export interface ExtractedItem {
  id: string;
  pageNumber: number;
  statement: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
}
export type TextSelection = {
  text: string;
  isWholeStatement: boolean;
  extractId?: string;
};

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);

  function handleSelection(
    source: "left" | "right",
    options?: {
      extractId?: string;
      onLeftSelection?: (text: string) => void;
    }
  ) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const rawText = sel.toString();
    const text = rawText.trim();
    if (!text) return;

    const isWholeStatement =
      rawText.includes("\\begin") ||
      rawText.includes("\\end") ||
      rawText.includes("{") ||
      rawText.includes("}");

    const rect = sel.getRangeAt(0).getBoundingClientRect();

    setSelection({
      text,
      extractId: options?.extractId,
      isWholeStatement,
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
        fileName: params.fileName,
        language: params.language,
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
    fileName: string;
    language: string;
  }) {
    await createDefiniendum({
      data: {
        symbolName: params.symbolName,
        symbolDeclared: true,
        futureRepo: params.futureRepo,
        filePath: params.filePath,
        fileName: params.fileName,
        language: params.language,
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
    fileName: null,
    language: null,
  });

  function validate(
    futureRepo: string,
    filePath: string,
    fileName: string,
    language: string
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

export function buildSymbolicRefMacro(selection: string, symbol: string) {
  const sel = selection.trim();
  const sym = symbol.trim();
  const key = `${sym}?${sym}`;

  return sel === sym ? `\\sn{${key}}` : `\\sr{${key}}{${sel}}`;
}

export function replaceFirstUnwrapped(
  text: string,
  target: string,
  replacement: string
): string {
  // Split target into words and escape safely
  const parts = target
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  /**
   * Build pattern:
   *  - \bsoftware\b
   *  - \bsoftware\s+engineering\b
   *  - tolerates newlines / indentation
   *  - avoids replacing inside \sr{ } or \sn{ }
   */
  const pattern =
    `(?<!\\\\sr\\{|\\\\sn\\{)` + // not already wrapped
    `\\b` +
    parts.join(`\\s+`) +
    `\\b`;

  const regex = new RegExp(pattern, "i");

  return text.replace(regex, replacement);
}

export function definiendumToLatex(d: {
  symbolName: string;
  alias: string | null;
  symbolDeclared: boolean;
}) {
  if (!d.symbolDeclared) return "";

  if (d.alias) {
    return `\\symdef{${d.symbolName}}{${d.alias}}`;
  }

  return `\\symdef{${d.symbolName}}{}`;
}
