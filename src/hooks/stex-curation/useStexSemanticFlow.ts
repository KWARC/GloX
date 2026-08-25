import { floDownDeclareSymbolUri } from "@/lib/floDownDeclareSymbolUri";
import { queryClient } from "@/queryClient";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { normalizeSymRef, ReplacePayload } from "@/server/parseUri";
import { ExtractedItem, useTextSelection } from "@/server/text-selection";
import { normalizeContentName } from "@/components/ExtractTextDialog";
import {
  CreatedSymbolTarget,
  createFloDownBlockWithDeclaredSymbol,
  declareCreatedSymbolDefiniendum,
} from "@/serverFns/createFloDownBlockWithDeclaredSymbol.server";
import { FileIdentity } from "@/serverFns/latex.server";
import { createSymbolDefiniendum } from "@/serverFns/symbol.server";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import {
  updateFloDownBlockAst,
  UpdateFloDownBlockAstResult,
} from "@/serverFns/updateFloDownBlock.server";
import { ExtractBlockType, supportsDefinienda } from "@/types/blockType";
import { ComponentProps, useState } from "react";
import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { findFloDownBlocksByIdentity } from "@/serverFns/extractFloDownBlock.server";

type DefiniendumSubmitParams = Parameters<
  ComponentProps<typeof DefiniendumDialog>["onSubmit"]
>[0];

export function useStexSemanticFlow(
  identity: FileIdentity,
  floDownBlocks: ExtractedItem[],
) {
  const { selection, popup, handleSelection, clearPopupOnly, clearAll } =
    useTextSelection();
  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const [semanticPanelFloDownBlockId, setSemanticPanelFloDownBlockId] = useState<string | null>(
    null,
  );
  const selectedFloDownBlock =
    floDownBlocks.find((d) => d.id === semanticPanelFloDownBlockId) ?? null;
  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [floDownBlockExtractId, setFloDownBlockExtractId] = useState<string | null>(null);
  const [floDownBlockExtractText, setFloDownBlockExtractText] = useState<string | null>(null);
  const [mode, setMode] = useState<"SymbolicRef" | null>(null);
  const [conceptUri, setConceptUri] = useState("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [savedSelection, setSavedSelection] = useState<typeof selection>(null);
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [pendingExtractText, setPendingExtractText] = useState("");
  const [paragraphFileName, setParagraphFileName] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [extractBlockType, setExtractBlockType] = useState<ExtractBlockType>("definition");
  const [createdSymbolTarget, setCreatedSymbolTarget] =
    useState<CreatedSymbolTarget | null>(null);
  const [duplicateFloDownBlocks, setDuplicateFloDownBlocks] = useState<Awaited<ReturnType<typeof findFloDownBlocksByIdentity>>>([]);
  const [pendingDuplicateSubmit, setPendingDuplicateSubmit] = useState<{ text: string; blockType: ExtractBlockType } | null>(null);

  function handleOpenSemanticPanel(floDownBlockId: string) {
    setSemanticPanelFloDownBlockId(floDownBlockId);
    setSemanticPanelOpen(true);
  }

  function handleCloseSemanticPanel() {
    setSemanticPanelOpen(false);
    setSemanticPanelFloDownBlockId(null);
  }

  function handleOpenDefiniendumDialog() {
    if (!selection?.extractId || !selection.text) return;
    const sourceFloDownBlock = floDownBlocks.find((d) => d.id === selection.extractId);
    if (!sourceFloDownBlock || !supportsDefinienda(sourceFloDownBlock.statement)) return;

    clearPopupOnly();
    setFloDownBlockExtractId(selection.extractId);
    setFloDownBlockExtractText(selection.text);
    setDefDialogOpen(true);
  }

  function handleOpenSymbolicRefDialog() {
    if (!selection?.extractId || !selection.text) return;
    setSavedSelection(selection);
    setFloDownBlockExtractId(selection.extractId);
    setConceptUri(selection.text);
    setEditingNodeId(null);
    setMode("SymbolicRef");
    clearPopupOnly();
  }

  function handleCreateSymbolTargetFloDownBlock() {
    if (!selection?.extractId || !selection.text) return;
    const normalizedName = normalizeContentName(selection.text);

    setPendingExtractText(selection.text);
    setParagraphFileName(normalizedName);
    setSymbolName(selection.text);
    setExtractBlockType("definition");
    setCreatedSymbolTarget(null);
    setExtractDialogOpen(true);
  }

  async function handleReplaceNode(
    floDownBlockId: string,
    target: { type: "definiendum" | "symref"; uri: string },
    payload: ReplacePayload,
    options?: { declaredSymbolName?: string },
  ): Promise<UpdateFloDownBlockAstResult> {
    const result = await updateFloDownBlockAst({
      data: {
        floDownBlockId,
        operation: {
          kind: "replaceSemantic",
          target,
          payload,
        },
        ...(options?.declaredSymbolName
          ? { declaredSymbolName: options.declaredSymbolName }
          : {}),
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity", identity],
    });

    return result;
  }

  async function handleDeleteNode(
    floDownBlockId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ): Promise<void> {
    await updateFloDownBlockAst({
      data: {
        floDownBlockId,
        operation: {
          kind: "removeSemantic",
          target,
        },
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity", identity],
    });
  }

  async function handleSaveSymbolicRef(symRef: UnifiedSymbolicReference) {
    if (!floDownBlockExtractId) return;

    if (editingNodeId) {
      const { uri, text } = normalizeSymRef(symRef);

      await updateFloDownBlockAst({
        data: {
          floDownBlockId: floDownBlockExtractId,
          operation: {
            kind: "replaceSemantic",
            target: {
              type: "symref",
              uri: editingNodeId,
            },
            payload: {
              type: "symref",
              uri,
              content: [text],
            },
          },
        },
      });
    } else {
      if (!selection?.text || !savedSelection) {
        return;
      }

      await symbolicRef({
        data: {
          floDownBlockId: floDownBlockExtractId,
          selection: {
            text: savedSelection.text,
            startOffset: selection.startOffset,
            endOffset: selection.endOffset,
          },
          symRef,
        },
      });
    }

    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity", identity],
    });

    setMode(null);
    setEditingNodeId(null);
  }

  async function handleDefiniendumSubmit(params: DefiniendumSubmitParams) {
    if (!floDownBlockExtractId || !floDownBlockExtractText) return;

    if (params.mode === "CREATE") {
      const result = await createSymbolDefiniendum({
        data: {
          floDownBlockId: floDownBlockExtractId,
          selectedText: floDownBlockExtractText,
          startOffset: selection!.startOffset,
          endOffset: selection!.endOffset,
          symdecl: true,

          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,

          symbolName: params.symbolName,
          symbolUri: await floDownDeclareSymbolUri({
            futureRepo: identity.futureRepo,
            filePath: identity.filePath,
            fileName: identity.fileName,
            language: identity.language,
            symbolName: params.symbolName,
          }),
        },
      });
      if (result.linkedExistingSymbol) {
        alert("The existing local symbol was linked instead of creating a duplicate declaration.");
      }
    } else {
      if (params.selectedSymbol.source === "DB") {
        await createSymbolDefiniendum({
          data: {
            floDownBlockId: floDownBlockExtractId,
            selectedText: floDownBlockExtractText,
            startOffset: selection!.startOffset,
            endOffset: selection!.endOffset,
            symdecl: false,

            futureRepo: identity.futureRepo,
            filePath: identity.filePath,
            fileName: identity.fileName,
            language: identity.language,

            symbolName: "",
            selectedSymbolSource: "DB",
            selectedSymbolId: params.selectedSymbol.id,
            selectedSymbolUri: params.selectedSymbol.symbolUri,
          },
        });
      } else {
        await createSymbolDefiniendum({
          data: {
            floDownBlockId: floDownBlockExtractId,
            selectedText: floDownBlockExtractText,
            startOffset: selection!.startOffset,
            endOffset: selection!.endOffset,
            symdecl: false,

            futureRepo: identity.futureRepo,
            filePath: identity.filePath,
            fileName: identity.fileName,
            language: identity.language,

            symbolName: "",
            selectedSymbolSource: "MATHHUB",
            selectedSymbolUri: params.selectedSymbol.uri,
          },
        });
      }
    }

    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity", identity],
    });

    setDefDialogOpen(false);
    setFloDownBlockExtractId(null);
    setFloDownBlockExtractText(null);
    clearAll();
  }

  async function performExtractSubmit({
    text: editedText,
    blockType,
  }: {
    text: string;
    blockType: ExtractBlockType;
  }) {
    if (!floDownBlockExtractId) return;

    const sourceFloDownBlock = floDownBlocks.find((definition) => definition.id === floDownBlockExtractId);
    if (!sourceFloDownBlock) return;

    const created = await createFloDownBlockWithDeclaredSymbol({
      data: {
        documentId: sourceFloDownBlock.documentId,
        documentPageId: null,
        pageNumber: null,
        blockType,
        paragraphFileName: paragraphFileName.trim(),
        originalText: editedText,
        symbolName: symbolName.trim(),
        symbolUri: await floDownDeclareSymbolUri({
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: paragraphFileName.trim(),
          language: identity.language,
          symbolName: symbolName.trim(),
        }),
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        language: identity.language,
      },
    });

    setCreatedSymbolTarget(created);
    setExtractDialogOpen(false);
    setPendingExtractText("");
    setParagraphFileName("");
    setSymbolName("");
    setExtractBlockType("definition");
    setMode(null);

    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity", identity],
    });
    await queryClient.invalidateQueries({
      queryKey: ["symbol-search-db"],
    });
  }

  async function handleExtractSubmit(input: { text: string; blockType: ExtractBlockType }) {
    const matches = await findFloDownBlocksByIdentity({ data: identity });
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

  async function handleDeclareCreatedSymbolDefiniendum(selectionRange: {
    selectedText: string;
    startOffset: number;
    endOffset: number;
  }) {
    if (!createdSymbolTarget) return;

    await declareCreatedSymbolDefiniendum({
      data: {
        floDownBlockId: createdSymbolTarget.floDownBlock.id,
        symbolId: createdSymbolTarget.symbol.id,
        selectedText: selectionRange.selectedText,
        startOffset: selectionRange.startOffset,
        endOffset: selectionRange.endOffset,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity", identity],
    });
    await queryClient.invalidateQueries({
      queryKey: ["symbol-search-db"],
    });

    setCreatedSymbolTarget(null);
  }

  const canOpenDefiniendumFromSelection =
    !!selection?.extractId &&
    (() => {
      const sourceFloDownBlock = floDownBlocks.find(
        (definition) => definition.id === selection.extractId,
      );
      return !!sourceFloDownBlock && supportsDefinienda(sourceFloDownBlock.statement);
    })();

  return {
    selection,
    popup,
    handleSelection,
    clearPopupOnly,
    semanticPanelOpen,
    selectedFloDownBlock,
    defDialogOpen,
    floDownBlockExtractText,
    mode,
    conceptUri,
    extractDialogOpen,
    pendingExtractText,
    paragraphFileName,
    setParagraphFileName,
    symbolName,
    setSymbolName,
    extractBlockType,
    setExtractBlockType,
    createdSymbolTarget,
    duplicateFloDownBlocks,
    setMode,
    setDefDialogOpen,
    setExtractDialogOpen,
    setCreatedSymbolTarget,
    setDuplicateFloDownBlocks,
    handleOpenSemanticPanel,
    handleCloseSemanticPanel,
    handleOpenDefiniendumDialog,
    handleOpenSymbolicRefDialog,
    handleCreateSymbolTargetFloDownBlock,
    handleReplaceNode,
    handleDeleteNode,
    handleSaveSymbolicRef,
    handleDefiniendumSubmit,
    handleExtractSubmit,
    confirmDuplicateCreation,
    handleDeclareCreatedSymbolDefiniendum,
    canOpenDefiniendumFromSelection,
  };
}
