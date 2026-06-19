import { queryClient } from "@/queryClient";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { ReplacePayload } from "@/server/parseUri";
import { ExtractedItem, useTextSelection } from "@/server/text-selection";
import { FileIdentity } from "@/serverFns/latex.server";
import { createSymbolDefiniendum } from "@/serverFns/symbol.server";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import {
  updateDefinitionAst,
  UpdateDefinitionAstResult,
} from "@/serverFns/updateDefinition.server";
import { ComponentProps, useState } from "react";
import { DefiniendumDialog } from "../DefiniendumDialog";

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
              uri:
                symRef.source === "MATHHUB"
                  ? symRef.uri
                  : `${symRef.futureRepo}/${symRef.symbolName}`,
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
      await createSymbolDefiniendum({
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
          alias: params.verbalization || null,
        },
      });
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
    setMode,
    setDefDialogOpen,
    handleOpenSemanticPanel,
    handleCloseSemanticPanel,
    handleOpenDefiniendumDialog,
    handleOpenSymbolicRefDialog,
    handleReplaceNode,
    handleDeleteNode,
    handleSaveSymbolicRef,
    handleDefiniendumSubmit,
  };
}
