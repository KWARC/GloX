import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  extractTextContent,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import { getInlineContent } from "@/server/ftml/statementContent";
import { normalizeSymRef } from "@/server/parseUri";
import {
  DefiniendumNode,
  DefinitionNode,
  FloDownContent,
  FloDownStatement,
  PersistedBlock,
  RootNode,
  SymrefNode,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/floDown.types";
import { RefObject, useEffect, useState } from "react";

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

function buildPlainDefinitionStatement(text: string): DefinitionNode {
  return {
    type: "definition",
    for_symbols: [],
    content: [
      {
        type: "paragraph",
        content: [text],
      },
    ],
  };
}

function getSelectionOffsets(
  container: HTMLElement,
  selection: Selection,
): DraftSelectionRange | null {
  if (selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const selectedText = selection.toString();

  if (!selectedText.trim()) return null;
  if (
    range.startContainer !== range.endContainer ||
    range.startContainer.nodeType !== Node.TEXT_NODE ||
    !container.contains(range.startContainer)
  ) {
    return null;
  }

  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(container);
  prefixRange.setEnd(range.startContainer, range.startOffset);

  const startOffset = prefixRange.toString().length;
  const endOffset = startOffset + selectedText.length;

  return {
    selectedText,
    startOffset,
    endOffset,
  };
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

function insertDefiniendumNode(
  statement: FloDownStatement,
  selection: DraftSelectionRange,
  payload:
    | {
        mode: "CREATE";
        symbolName: string;
      }
    | {
        mode: "PICK_EXISTING";
        symbol:
          | {
              source: "DB";
              symbolName: string;
            }
          | {
              source: "MATHHUB";
              uri: string;
            };
      },
): FloDownStatement {
  const root = normalizeToRoot(statement);
  const location = findLocationByGlobalOffset(
    root,
    selection.selectedText,
    selection.startOffset,
  );

  if (!location) {
    throw new Error("Exact selection match not found in draft FTML");
  }

  const targetPath = [location.paragraphIndex, location.contentIndex];
  if (pathTraversesSemanticNode(root, targetPath)) {
    throw new Error("Cannot insert definiendum inside existing semantic node");
  }

  const verbalization = selection.selectedText;

  const node: DefiniendumNode =
    payload.mode === "CREATE"
      ? {
          type: "definiendum",
          uri: payload.symbolName.trim(),
          content: [verbalization],
          symdecl: true,
        }
      : payload.symbol.source === "DB"
        ? {
            type: "definiendum",
            uri: payload.symbol.symbolName,
            content: [verbalization],
            symdecl: false,
          }
        : {
            type: "definiendum",
            uri: payload.symbol.uri,
            content: [verbalization],
            symdecl: false,
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
    throw new Error("Exact selection match not found in draft FTML");
  }

  const targetPath = [location.paragraphIndex, location.contentIndex];
  if (pathTraversesSemanticNode(root, targetPath)) {
    throw new Error(
      "Cannot add symbolic reference inside existing semantic node",
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

export function statementHasDeclaredSymbol(
  declaredSymbols: readonly string[] | undefined,
  symbolName: string,
): boolean {
  if (!declaredSymbols?.length || !symbolName.trim()) return false;
  return declaredSymbols.includes(symbolName.trim());
}

function containsSemanticNodes(node: FloDownContent | PersistedBlock): boolean {
  if (typeof node === "string") return false;
  if (node.type === "definiendum" || node.type === "symref") return true;
  if (node.type === "paragraph" || node.type === "definition") {
    const content =
      node.type === "paragraph" ? node.content : getInlineContent(node);
    return content.some(containsSemanticNodes);
  }
  return ("content" in node ? (node.content ?? []) : []).some(containsSemanticNodes);
}

export function useDraftSemanticAuthoring(
  text: string,
  enabled: boolean,
  previewRef: RefObject<HTMLDivElement | null>,
) {
  const [statement, setStatement] = useState<FloDownStatement>(() =>
    buildPlainDefinitionStatement(text),
  );
  const [declaredSymbols, setDeclaredSymbols] = useState<string[]>([]);
  const [selection, setSelection] = useState<DraftSelectionRange | null>(null);
  const [popup, setPopup] = useState<DraftSelectionPopup | null>(null);

  useEffect(() => {
    setStatement(buildPlainDefinitionStatement(text));
    setDeclaredSymbols([]);
    setSelection(null);
    setPopup(null);
  }, [text, enabled]);

  function handlePreviewMouseUp() {
    if (!enabled) return;

    const container = previewRef.current;
    const selected = window.getSelection();

    if (!container || !selected) return;
    const nextSelection = getSelectionOffsets(container, selected);
    setSelection(nextSelection);

    if (!nextSelection) {
      setPopup(null);
      return;
    }

    const range = selected.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setPopup({
      x: rect.right + window.scrollX + 8,
      y: rect.top + window.scrollY - 4,
      source: "right",
    });
  }

  function clearSelection() {
    setSelection(null);
    setPopup(null);
    window.getSelection()?.removeAllRanges();
  }

  function clearPopup() {
    setPopup(null);
  }

  const hasSemantics = normalizeToRoot(statement).content.some(containsSemanticNodes);

  function applyDefiniendum(
    payload:
      | {
          mode: "CREATE";
          symbolName: string;
        }
      | {
          mode: "PICK_EXISTING";
          symbol:
            | {
                source: "DB";
                symbolName: string;
              }
            | {
                source: "MATHHUB";
                uri: string;
              };
        },
  ) {
    if (!selection) {
      throw new Error("Select text in the FTML preview first");
    }

    setStatement((current) => insertDefiniendumNode(current, selection, payload));
    if (payload.mode === "CREATE") {
      const symbolName = payload.symbolName.trim();
      setDeclaredSymbols((current) =>
        current.includes(symbolName) ? current : [...current, symbolName],
      );
    }
    clearSelection();
  }

  function applySymref(symRef: UnifiedSymbolicReference) {
    if (!selection) {
      throw new Error("Select text in the FTML preview first");
    }

    setStatement((current) => insertSymrefNode(current, selection, symRef));
    clearSelection();
  }

  return {
    statement,
    declaredSymbols,
    selection,
    popup,
    hasSemantics,
    handlePreviewMouseUp,
    clearSelection,
    clearPopup,
    applyDefiniendum,
    applySymref,
  };
}
