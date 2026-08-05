import { queryClient } from "@/queryClient";
import { parseModuleStatementExtractId } from "@/lib/moduleStatementExtracts";
import { moduleStatementsToExtractedItems } from "@/lib/moduleStatementExtracts";
import type { ModuleStatementExportIdentity } from "@/lib/moduleStatementExtracts";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { normalizeSymRef, ReplacePayload } from "@/server/parseUri";
import {
  ExtractedItem,
  TextSelection,
} from "@/server/text-selection";
import {
  moduleDescriptionSymbolicRef,
  updateModuleDescriptionAst,
  updateModuleDescriptionStatement,
} from "@/serverFns/moduleDescription.server";
import { getModuleDescriptionPage } from "@/serverFns/moduleDescription.server";
import { FloDownStatement } from "@/types/floDown.types";
import { useSniffyReferenceSuggestions } from "@/hooks/useSniffyReferenceSuggestions";
import { useCallback, useRef, useState } from "react";

type SniffyCatalog = Parameters<
  typeof useSniffyReferenceSuggestions
>[0]["catalog"];

export function useModuleStatementSemantics({
  moduleId,
  extracts,
  selection,
  handleSelection,
  clearPopupOnly,
  clearAll,
}: {
  moduleId: string;
  extracts: ExtractedItem[];
  selection: TextSelection | null;
  handleSelection: (
    source: "left" | "right",
    options?: {
      extractId?: string;
      onLeftSelection?: (text: string) => void;
    },
  ) => void;
  clearPopupOnly: () => void;
  clearAll: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"SymbolicRef" | null>(null);
  const [conceptUri, setConceptUri] = useState("");
  const [activeExtractId, setActiveExtractId] = useState<string | null>(null);
  const [symbolicRefSaving, setSymbolicRefSaving] = useState(false);
  const [lockedByExtractId, setLockedByExtractId] = useState<string | null>(
    null,
  );
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const [semanticPanelExtractId, setSemanticPanelExtractId] = useState<
    string | null
  >(null);
  const pendingSelectionRef = useRef<TextSelection | null>(null);

  const invalidateModule = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["module-description", moduleId],
    });
    await queryClient.invalidateQueries({ queryKey: ["symbol-search-db"] });
  }, [moduleId]);

  function handleOpenSemanticPanel(extractId: string) {
    setSemanticPanelExtractId(extractId);
    setSemanticPanelOpen(true);
  }

  async function handleDeleteNode(
    extractId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ) {
    const parsed = parseModuleStatementExtractId(extractId);
    if (!parsed) return;

    await updateModuleDescriptionAst({
      data: {
        moduleDescriptionId: parsed.moduleDescriptionId,
        field: parsed.field,
        operation: { kind: "removeSemantic", target },
      },
    });

    await invalidateModule();
    setSemanticPanelOpen(false);
    setSemanticPanelExtractId(null);
  }

  function handleRightSelection(extractId: string) {
    setLockedByExtractId(extractId);
    handleSelection("right", { extractId });
  }

  async function handleSaveSymbolicRef(symRef: UnifiedSymbolicReference) {
    if (!activeExtractId) return;
    const parsed = parseModuleStatementExtractId(activeExtractId);
    if (!parsed) return;

    setSymbolicRefSaving(true);
    try {
      if (editingNodeId) {
        const { uri } = normalizeSymRef(symRef);

        await updateModuleDescriptionAst({
          data: {
            moduleDescriptionId: parsed.moduleDescriptionId,
            field: parsed.field,
            operation: {
              kind: "replaceSemantic",
              target: { type: "symref", uri: editingNodeId },
              payload: { type: "symref", uri },
            },
          },
        });
      } else {
        const activeSelection = selection ?? pendingSelectionRef.current;
        if (!activeSelection) return;

        await moduleDescriptionSymbolicRef({
          data: {
            moduleDescriptionId: parsed.moduleDescriptionId,
            field: parsed.field,
            selection: {
              text: activeSelection.text,
              startOffset: activeSelection.startOffset,
              endOffset: activeSelection.endOffset,
            },
            symRef,
          },
        });
      }

      await invalidateModule();
      setEditingNodeId(null);
      setMode(null);
      setActiveExtractId(null);
      pendingSelectionRef.current = null;
      clearAll();
    } finally {
      setSymbolicRefSaving(false);
    }
  }

  function handleOpenSymbolicRef(extractId: string) {
    if (!selection) return;

    pendingSelectionRef.current = selection;
    setActiveExtractId(extractId);
    setConceptUri(selection.text);
    setMode("SymbolicRef");
    clearPopupOnly();
  }

  function reopenSymbolicRef(extractId: string, conceptUri: string) {
    setActiveExtractId(extractId);
    setConceptUri(conceptUri);
    setMode("SymbolicRef");
  }

  function hideSymbolicRefDialog() {
    setMode(null);
    setActiveExtractId(null);
  }

  function handleCloseSymbolicRefDialog() {
    setMode(null);
    setActiveExtractId(null);
    pendingSelectionRef.current = null;
    clearAll();
  }

  async function handleReplaceNode(
    extractId: string,
    target: { type: "definiendum" | "symref"; uri: string },
    payload: ReplacePayload,
  ) {
    const parsed = parseModuleStatementExtractId(extractId);
    if (!parsed) throw new Error("Invalid module statement");

    const result = await updateModuleDescriptionAst({
      data: {
        moduleDescriptionId: parsed.moduleDescriptionId,
        field: parsed.field,
        operation: {
          kind: "replaceSemantic",
          target,
          payload,
        },
      },
    });

    await invalidateModule();
    return result;
  }

  function handleToggleEdit(id: string) {
    setEditingId(editingId === id ? null : id);
  }

  async function handleUpdateExtract(id: string, statement: FloDownStatement) {
    const parsed = parseModuleStatementExtractId(id);
    if (!parsed) return;

    await updateModuleDescriptionStatement({
      data: {
        moduleDescriptionId: parsed.moduleDescriptionId,
        field: parsed.field,
        statement,
      },
    });
    await invalidateModule();
    setEditingId(null);
  }

  function openSymbolicRefFromSelection() {
    if (!selection?.extractId) return;
    const extract = extracts.find((e) => e.id === selection.extractId);
    if (!extract) return;
    handleOpenSymbolicRef(extract.id);
  }

  return {
    editingId,
    lockedByExtractId,
    symbolicRefSaving,
    mode,
    conceptUri,
    semanticPanelOpen,
    setSemanticPanelOpen,
    semanticPanelExtractId,
    setSemanticPanelExtractId,
    handleOpenSemanticPanel,
    handleSaveSymbolicRef,
    handleReplaceNode,
    handleDeleteNode,
    handleRightSelection,
    handleToggleEdit,
    handleUpdateExtract,
    handleOpenSymbolicRef,
    handleCloseSymbolicRefDialog,
    hideSymbolicRefDialog,
    reopenSymbolicRef,
    openSymbolicRefFromSelection,
  };
}

export function useModuleStatementSniffyFlow({
  moduleId,
  moduleDescriptionId,
  exportIdentity,
  extracts,
  sniffyCatalog,
  staticCatalogLoading,
  staticCatalogError,
  retryStaticCatalog,
}: {
  moduleId: string;
  moduleDescriptionId: string;
  exportIdentity: ModuleStatementExportIdentity;
  extracts: ExtractedItem[];
  sniffyCatalog: SniffyCatalog;
  staticCatalogLoading: boolean;
  staticCatalogError: Error | null;
  retryStaticCatalog: () => Promise<void>;
}) {
  return useSniffyReferenceSuggestions({
    floDownBlocks: extracts,
    catalog: sniffyCatalog,
    catalogLoading: staticCatalogLoading,
    catalogError: staticCatalogError,
    retryCatalog: retryStaticCatalog,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: ["module-description", moduleId],
        refetchType: "none",
      }),
    refetchFloDownBlocks: async () => {
      const page = await getModuleDescriptionPage({ data: { moduleId } });
      const mod = page.moduleDescription;
      if (!mod) return [];

      return moduleStatementsToExtractedItems({
        moduleDescriptionId,
        moduleId,
        titleStatement: mod.titleStatement,
        inhaltStatement: mod.inhaltStatement,
        lernzieleStatement: mod.lernzieleStatement,
        exportIdentity,
      });
    },
    applySymbolicRef: async ({ extractId, selection, symRef }) => {
      const parsed = parseModuleStatementExtractId(extractId);
      if (!parsed) return;

      await moduleDescriptionSymbolicRef({
        data: {
          moduleDescriptionId: parsed.moduleDescriptionId,
          field: parsed.field,
          selection,
          symRef,
        },
      });
    },
  });
}
