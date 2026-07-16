import { queryClient } from "@/queryClient";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { normalizeSymRef, ReplacePayload } from "@/server/parseUri";
import { ExtractedItem, useTextSelection } from "@/server/text-selection";
import { normalizeContentName } from "@/components/ExtractTextDialog";
import {
  CreatedSymbolTarget,
  createDefinitionWithDeclaredSymbol,
  declareCreatedSymbolDefiniendum,
} from "@/serverFns/createDefinitionWithDeclaredSymbol.server";
import { FileIdentity } from "@/serverFns/latex.server";
import { createSymbolDefiniendum } from "@/serverFns/symbol.server";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import {
  updateDefinitionAst,
  UpdateDefinitionAstResult,
} from "@/serverFns/updateDefinition.server";
import { ParagraphKind, supportsDefinienda } from "@/types/paragraphKind";
import { ComponentProps, useState } from "react";
import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { findDefinitionsByIdentity } from "@/serverFns/extractDefinition.server";

type DefiniendumSubmitParams = Parameters<
  ComponentProps<typeof DefiniendumDialog>["onSubmit"]
>[0];

export function useStexSemanticFlow(
  identity: FileIdentity,
  definitions: ExtractedItem[],
) {
  const { selection, popup, handleSelection, clearPopupOnly, clearAll } =
    useTextSelection();
  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const [semanticPanelDefId, setSemanticPanelDefId] = useState<string | null>(
    null,
  );
  const selectedDefinition =
    definitions.find((d) => d.id === semanticPanelDefId) ?? null;
  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [defExtractId, setDefExtractId] = useState<string | null>(null);
  const [defExtractText, setDefExtractText] = useState<string | null>(null);
  const [mode, setMode] = useState<"SymbolicRef" | null>(null);
  const [conceptUri, setConceptUri] = useState("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [savedSelection, setSavedSelection] = useState<typeof selection>(null);
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [pendingExtractText, setPendingExtractText] = useState("");
  const [definitionName, setDefinitionName] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [extractKind, setExtractKind] = useState<ParagraphKind>("Definition");
  const [createdSymbolTarget, setCreatedSymbolTarget] =
    useState<CreatedSymbolTarget | null>(null);
  const [duplicateDefinitions, setDuplicateDefinitions] = useState<Awaited<ReturnType<typeof findDefinitionsByIdentity>>>([]);
  const [pendingDuplicateSubmit, setPendingDuplicateSubmit] = useState<{ text: string; kind: ParagraphKind } | null>(null);

  function handleOpenSemanticPanel(definitionId: string) {
    setSemanticPanelDefId(definitionId);
    setSemanticPanelOpen(true);
  }

  function handleCloseSemanticPanel() {
    setSemanticPanelOpen(false);
    setSemanticPanelDefId(null);
  }

  function handleOpenDefiniendumDialog() {
    if (!selection?.extractId || !selection.text) return;
    const sourceDefinition = definitions.find((d) => d.id === selection.extractId);
    if (!sourceDefinition || !supportsDefinienda(sourceDefinition.kind)) return;

    clearPopupOnly();
    setDefExtractId(selection.extractId);
    setDefExtractText(selection.text);
    setDefDialogOpen(true);
  }

  function handleOpenSymbolicRefDialog() {
    if (!selection?.extractId || !selection.text) return;
    setSavedSelection(selection);
    setDefExtractId(selection.extractId);
    setConceptUri(selection.text);
    setEditingNodeId(null);
    setMode("SymbolicRef");
    clearPopupOnly();
  }

  function handleCreateSymbolTargetDefinition() {
    if (!selection?.extractId || !selection.text) return;
    const normalizedName = normalizeContentName(selection.text);

    setPendingExtractText(selection.text);
    setDefinitionName(normalizedName);
    setSymbolName(selection.text);
    setExtractKind("Definition");
    setCreatedSymbolTarget(null);
    setExtractDialogOpen(true);
  }

  async function handleReplaceNode(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
    payload: ReplacePayload,
  ): Promise<UpdateDefinitionAstResult> {
    const result = await updateDefinitionAst({
      data: {
        definitionId,
        operation: {
          kind: "replaceSemantic",
          target,
          payload,
        },
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });

    return result;
  }

  async function handleDeleteNode(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ): Promise<void> {
    await updateDefinitionAst({
      data: {
        definitionId,
        operation: {
          kind: "removeSemantic",
          target,
        },
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
  }

  async function handleSaveSymbolicRef(symRef: UnifiedSymbolicReference) {
    if (!defExtractId) return;

    if (editingNodeId) {
      const { uri, text } = normalizeSymRef(symRef);

      await updateDefinitionAst({
        data: {
          definitionId: defExtractId,
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
          definitionId: defExtractId,
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
      queryKey: ["definitionsByIdentity", identity],
    });

    setMode(null);
    setEditingNodeId(null);
  }

  async function handleDefiniendumSubmit(params: DefiniendumSubmitParams) {
    if (!defExtractId || !defExtractText) return;

    if (params.mode === "CREATE") {
      const result = await createSymbolDefiniendum({
        data: {
          definitionId: defExtractId,
          selectedText: defExtractText,
          startOffset: selection!.startOffset,
          endOffset: selection!.endOffset,
          symdecl: true,

          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,

          symbolName: params.symbolName,
        },
      });
      if (result.linkedExistingSymbol) {
        alert("The existing local symbol was linked instead of creating a duplicate declaration.");
      }
    } else {
      if (params.selectedSymbol.source === "DB") {
        await createSymbolDefiniendum({
          data: {
            definitionId: defExtractId,
            selectedText: defExtractText,
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
          },
        });
      } else {
        await createSymbolDefiniendum({
          data: {
            definitionId: defExtractId,
            selectedText: defExtractText,
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
      queryKey: ["definitionsByIdentity", identity],
    });

    setDefDialogOpen(false);
    setDefExtractId(null);
    setDefExtractText(null);
    clearAll();
  }

  async function performExtractSubmit({
    text: editedText,
    kind,
  }: {
    text: string;
    kind: ParagraphKind;
  }) {
    if (!defExtractId) return;

    const sourceDefinition = definitions.find((definition) => definition.id === defExtractId);
    if (!sourceDefinition) return;

    const created = await createDefinitionWithDeclaredSymbol({
      data: {
        documentId: sourceDefinition.documentId,
        documentPageId: null,
        pageNumber: null,
        kind,
        definitionName: definitionName.trim(),
        definitionText: editedText,
        symbolName: symbolName.trim(),
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        language: identity.language,
      },
    });

    setCreatedSymbolTarget(created);
    setExtractDialogOpen(false);
    setPendingExtractText("");
    setDefinitionName("");
    setSymbolName("");
    setExtractKind("Definition");
    setMode(null);

    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
    await queryClient.invalidateQueries({
      queryKey: ["symbol-search-db"],
    });
  }

  async function handleExtractSubmit(input: { text: string; kind: ParagraphKind }) {
    const matches = await findDefinitionsByIdentity({ data: identity });
    if (matches.length) {
      setDuplicateDefinitions(matches);
      setPendingDuplicateSubmit(input);
      return;
    }
    await performExtractSubmit(input);
  }

  async function confirmDuplicateCreation() {
    if (!pendingDuplicateSubmit) return;
    const input = pendingDuplicateSubmit;
    setDuplicateDefinitions([]);
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
        definitionId: createdSymbolTarget.definition.id,
        symbolId: createdSymbolTarget.symbol.id,
        selectedText: selectionRange.selectedText,
        startOffset: selectionRange.startOffset,
        endOffset: selectionRange.endOffset,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
    await queryClient.invalidateQueries({
      queryKey: ["symbol-search-db"],
    });

    setCreatedSymbolTarget(null);
  }

  const canOpenDefiniendumFromSelection =
    !!selection?.extractId &&
    (() => {
      const sourceDefinition = definitions.find(
        (definition) => definition.id === selection.extractId,
      );
      return !!sourceDefinition && supportsDefinienda(sourceDefinition.kind);
    })();

  return {
    selection,
    popup,
    handleSelection,
    clearPopupOnly,
    semanticPanelOpen,
    selectedDefinition,
    defDialogOpen,
    defExtractText,
    mode,
    conceptUri,
    extractDialogOpen,
    pendingExtractText,
    definitionName,
    setDefinitionName,
    symbolName,
    setSymbolName,
    extractKind,
    setExtractKind,
    createdSymbolTarget,
    duplicateDefinitions,
    setMode,
    setDefDialogOpen,
    setExtractDialogOpen,
    setCreatedSymbolTarget,
    setDuplicateDefinitions,
    handleOpenSemanticPanel,
    handleCloseSemanticPanel,
    handleOpenDefiniendumDialog,
    handleOpenSymbolicRefDialog,
    handleCreateSymbolTargetDefinition,
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
