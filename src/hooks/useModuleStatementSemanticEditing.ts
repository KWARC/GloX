import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  extractTextContent,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import { getInlineContent } from "@/server/ftml/statementContent";
import { normalizeSymRef } from "@/server/parseUri";
import {
  FloDownContent,
  FloDownStatement,
  PersistedBlock,
  RootNode,
  SymrefNode,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/floDown.types";
import { MouseEvent, RefObject, useEffect, useRef, useState } from "react";

function getSelectionOffsets(
  container: HTMLElement,
  selection: Selection,
): DraftSelectionRange | null {
  if (selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();

  if (!selectedText.trim()) return null;
  if (!container.contains(range.commonAncestorContainer)) return null;

  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(container);
  prefixRange.setEnd(range.startContainer, range.startOffset);

  const startOffset = prefixRange.toString().length;
  const endOffset = startOffset + selectedText.length;

  return { selectedText, startOffset, endOffset };
}

function findLocationByGlobalOffset(
  root: RootNode,
  selectedText: string,
  startOffset: number,
) {
  let cursor = 0;

  for (const [paragraphIndex, block] of root.content.entries()) {
    const paragraphContent = getInlineContent(block);

    for (const [contentIndex, item] of paragraphContent.entries()) {
      if (typeof item === "string") {
        let searchOffset = 0;
        while (true) {
          const index = item.indexOf(selectedText, searchOffset);
          if (index === -1) break;

          if (cursor + index === startOffset) {
            return {
              paragraphIndex,
              contentIndex,
              offset: index,
              occurrence: 0,
            };
          }

          searchOffset = index + 1;
        }

        cursor += item.length;
      } else {
        cursor += extractTextContent(item).length;
      }
    }
  }

  return null;
}

function insertSymrefNode(
  statement: FloDownStatement,
  selection: DraftSelectionRange,
  symRef: UnifiedSymbolicReference,
): FloDownStatement {
  const root = normalizeToRoot(statement);
  const location = findLocationByGlobalOffset(
    root,
    selection.selectedText,
    selection.startOffset,
  );

  if (!location) {
    throw new Error(
      "Could not locate the selected text in this field. Try selecting a shorter phrase.",
    );
  }

  const targetPath = [location.paragraphIndex, location.contentIndex];
  if (pathTraversesSemanticNode(root, targetPath)) {
    throw new Error(
      "Cannot add a symbolic reference inside an existing semantic node.",
    );
  }

  const { uri } = normalizeSymRef(symRef);
  const node: SymrefNode = {
    type: "symref",
    uri,
    content: [selection.selectedText],
  };

  const updatedRoot = replaceTextWithNode(
    root,
    location,
    location.offset,
    location.offset + selection.selectedText.length,
    node,
  );

  return unwrapRoot(updatedRoot);
}

function containsSemanticNodes(node: FloDownContent | PersistedBlock): boolean {
  if (typeof node === "string") return false;
  if (node.type === "definiendum" || node.type === "symref") return true;
  if (node.type === "paragraph" || node.type === "definition") {
    const content =
      node.type === "paragraph" ? node.content : getInlineContent(node);
    return content.some(containsSemanticNodes);
  }
  return ("content" in node ? (node.content ?? []) : []).some(
    containsSemanticNodes,
  );
}

export type DraftSelectionRange = {
  selectedText: string;
  startOffset: number;
  endOffset: number;
};

export type DraftSelectionPopup = {
  x: number;
  y: number;
  source: "right";
};

export function useModuleStatementSemanticEditing(
  initialStatement: FloDownStatement,
  enabled: boolean,
  selectionContainerRef: RefObject<HTMLElement | null>,
) {
  const [statement, setStatement] = useState<FloDownStatement>(initialStatement);
  const [selection, setSelection] = useState<DraftSelectionRange | null>(null);
  const [popup, setPopup] = useState<DraftSelectionPopup | null>(null);
  const selectionRef = useRef<DraftSelectionRange | null>(null);
  const lastSyncedKeyRef = useRef("");
  const popupFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const key = JSON.stringify(initialStatement);
    if (key === lastSyncedKeyRef.current) return;
    lastSyncedKeyRef.current = key;
    setStatement(initialStatement);
    setSelection(null);
    selectionRef.current = null;
    setPopup(null);
  }, [initialStatement]);

  function captureSelection() {
    if (!enabled) return;

    const container = selectionContainerRef.current;
    const selected = window.getSelection();

    if (!container || !selected || selected.rangeCount === 0) return;

    const nextSelection = getSelectionOffsets(container, selected);
    if (!nextSelection) {
      selectionRef.current = null;
      setSelection(null);
      setPopup(null);
      return;
    }

    const range = selected.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Store synchronously so Symbolic Ref always has the selected text.
    selectionRef.current = nextSelection;

    const popupPos = {
      x: rect.right + 8,
      y: rect.top - 4,
      source: "right" as const,
    };

    // Defer popup render so the browser can finish painting the highlight.
    if (popupFrameRef.current !== null) {
      cancelAnimationFrame(popupFrameRef.current);
    }
    popupFrameRef.current = requestAnimationFrame(() => {
      popupFrameRef.current = null;
      setSelection(nextSelection);
      setPopup(popupPos);
    });
  }

  function handleSelectionMouseUp(event: MouseEvent) {
    event.stopPropagation();
    captureSelection();
  }

  useEffect(() => {
    return () => {
      if (popupFrameRef.current !== null) {
        cancelAnimationFrame(popupFrameRef.current);
      }
    };
  }, []);

  function clearSelection() {
    if (popupFrameRef.current !== null) {
      cancelAnimationFrame(popupFrameRef.current);
      popupFrameRef.current = null;
    }
    setSelection(null);
    selectionRef.current = null;
    setPopup(null);
    window.getSelection()?.removeAllRanges();
  }

  function clearPopup() {
    setPopup(null);
  }

  const hasSemantics = normalizeToRoot(statement).content.some(
    containsSemanticNodes,
  );

  function applySymref(symRef: UnifiedSymbolicReference) {
    const activeSelection = selectionRef.current ?? selection;
    if (!activeSelection) {
      throw new Error("Select text first");
    }

    const next = insertSymrefNode(statement, activeSelection, symRef);
    setStatement(next);
    clearSelection();
    return next;
  }

  return {
    statement,
    selection,
    selectionRef,
    popup,
    hasSemantics,
    handleSelectionMouseUp,
    clearSelection,
    clearPopup,
    applySymref,
  };
}
