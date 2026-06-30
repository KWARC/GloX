import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  extractTextContent,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import { normalizeSymRef, parseUri } from "@/server/parseUri";
import {
  DefiniendumNode,
  DefinitionNode,
  FtmlContent,
  FtmlStatement,
  RootNode,
  SymrefNode,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/ftml.types";
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

  for (const [paragraphIndex, node] of root.content.entries()) {
    let paragraphContent = [];

    if (node.type === "paragraph") {
      paragraphContent = node.content ?? [];
    } else if (node.type === "definition") {
      const firstChild = node.content?.[0];
      if (
        firstChild &&
        typeof firstChild !== "string" &&
        firstChild.type === "paragraph"
      ) {
        paragraphContent = firstChild.content ?? [];
      } else {
        continue;
      }
    } else {
      continue;
    }

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
        cursor += extractTextContent(item);
      }
    }
  }

  return null;
}

function insertDefiniendumNode(
  statement: FtmlStatement,
  selection: DraftSelectionRange,
  payload:
    | {
        mode: "CREATE";
        symbolName: string;
        verbalization: string;
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
): FtmlStatement {
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

  const node: DefiniendumNode =
    payload.mode === "CREATE"
      ? {
          type: "definiendum",
          uri: payload.symbolName.trim(),
          content: [payload.verbalization.trim() || payload.symbolName.trim()],
          symdecl: true,
        }
      : payload.symbol.source === "DB"
        ? {
            type: "definiendum",
            uri: payload.symbol.symbolName,
            content: [payload.symbol.symbolName],
            symdecl: false,
          }
        : {
            type: "definiendum",
            uri: payload.symbol.uri,
            content: [parseUri(payload.symbol.uri).symbol],
            symdecl: false,
          };

  const updatedRoot = replaceTextWithNode(
    root,
    location,
    location.offset,
    location.offset + selection.selectedText.length,
    node,
  );

  const definition = updatedRoot.content.find(
    (item): item is DefinitionNode => item.type === "definition",
  );

  if (definition) {
    const existingSymbols = definition.for_symbols ?? [];
    if (!existingSymbols.includes(node.uri)) {
      definition.for_symbols = [...existingSymbols, node.uri];
    }
  }

  return unwrapRoot(updatedRoot);
}

function insertSymrefNode(
  statement: FtmlStatement,
  selection: DraftSelectionRange,
  symRef: UnifiedSymbolicReference,
): FtmlStatement {
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

  const { uri, text } = normalizeSymRef(symRef);
  const node: SymrefNode = {
    type: "symref",
    uri,
    content: [text],
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
  statement: FtmlStatement | undefined,
  symbolName: string,
): boolean {
  if (!statement || !symbolName.trim()) return false;

  const root = normalizeToRoot(statement);
  return root.content.some((node) => {
    if (node.type !== "definition") return false;
    return (node.for_symbols ?? []).includes(symbolName.trim());
  });
}

export function useDraftSemanticAuthoring(
  text: string,
  enabled: boolean,
  previewRef: RefObject<HTMLDivElement | null>,
) {
  const [statement, setStatement] = useState<FtmlStatement>(() =>
    buildPlainDefinitionStatement(text),
  );
  const [selection, setSelection] = useState<DraftSelectionRange | null>(null);
  const [popup, setPopup] = useState<DraftSelectionPopup | null>(null);

  useEffect(() => {
    setStatement(buildPlainDefinitionStatement(text));
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

  function applyDefiniendum(
    payload:
      | {
          mode: "CREATE";
          symbolName: string;
          verbalization: string;
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
    selection,
    popup,
    handlePreviewMouseUp,
    clearSelection,
    clearPopup,
    applyDefiniendum,
    applySymref,
  };
}
