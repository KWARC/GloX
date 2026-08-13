import { queryClient } from "@/queryClient";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { normalizeSymRef, parseUri, ReplacePayload } from "@/server/parseUri";
import {
  ExtractedItem,
  TextSelection,
  TextSelectionOptions,
  useValidation,
} from "@/server/text-selection";
import { SymbolSearchResult } from "@/server/useSymbolSearch";
import {
  deleteFloDownBlock,
  updateFloDownBlock,
} from "@/serverFns/extractFloDownBlock.server";
import { createSymbolDefiniendum } from "@/serverFns/symbol.server";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import { updateFloDownBlockAst } from "@/serverFns/updateFloDownBlock.server";
import { DefiniendumNode, FloDownStatement } from "@/types/floDown.types";
import { supportsDefinienda } from "@/types/blockType";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

type DefiniendumSubmitParams =
  | {
      mode: "CREATE";
      symbolName: string;
      symdecl: true;
    }
  | { mode: "PICK_EXISTING"; selectedSymbol: SymbolSearchResult };

export function useModuleDefinitionSemantics({
  moduleId,
  moduleDescriptionId,
  extracts,
  selection,
  handleSelection,
  clearPopupOnly,
  clearAll,
}: {
  moduleId: string;
  moduleDescriptionId: string;
  extracts: ExtractedItem[];
  selection: TextSelection | null;
  handleSelection: (
    source: "left" | "right",
    options?: TextSelectionOptions,
  ) => void;
  clearPopupOnly: () => void;
  clearAll: () => void;
}) {
  const navigate = useNavigate();
  const [futureRepo, setFutureRepo] = useState("courses/FAU/module-descriptions");
  const [filePath, setFilePath] = useState("defs");
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState("de");
  const { validate, clearError } = useValidation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"SymbolicRef" | null>(null);
  const [conceptUri, setConceptUri] = useState<string>("");
  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [floDownBlockExtractId, setFloDownBlockExtractId] = useState<string | null>(
    null,
  );
  const [floDownBlockExtractText, setFloDownBlockExtractText] = useState("");
  const [symbolicRefSaving, setSymbolicRefSaving] = useState(false);
  const [lockedByExtractId, setLockedByExtractId] = useState<string | null>(null);
  const [latexConfigOpen, setLatexConfigOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const [semanticPanelFloDownBlockId, setSemanticPanelFloDownBlockId] = useState<
    string | null
  >(null);
  const [floDownBlockMetaEditOpen, setFloDownBlockMetaEditOpen] = useState(false);
  const [floDownBlockMetaTarget, setFloDownBlockMetaTarget] =
    useState<ExtractedItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExtractedItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const invalidateModule = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["module-description", moduleId],
    });
    await queryClient.invalidateQueries({ queryKey: ["symbol-search-db"] });
    await queryClient.invalidateQueries({
      queryKey: ["floDownBlocksByIdentity"],
    });
  }, [moduleId]);

  function validateIdentity() {
    return validate(futureRepo, filePath, fileName, language);
  }

  async function handleDeleteDefinition(id: string) {
    const definition = extracts.find((item) => item.id === id);
    if (definition) setDeleteTarget(definition);
  }

  async function confirmDeleteDefinition() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteFloDownBlock({ data: { id: deleteTarget.id } });
      await invalidateModule();
      if (lockedByExtractId === deleteTarget.id) {
        setLockedByExtractId(null);
        setEditingId(null);
      }
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleOpenSemanticPanel(floDownBlockId: string) {
    setSemanticPanelFloDownBlockId(floDownBlockId);
    setSemanticPanelOpen(true);
  }

  function handleEditFloDownBlockMeta(item: ExtractedItem) {
    setFloDownBlockMetaTarget(item);
    setFutureRepo(item.futureRepo);
    setFilePath(item.filePath);
    setFileName(item.fileName);
    setLanguage(item.language);
    setFloDownBlockMetaEditOpen(true);
  }

  async function handleDeleteNode(
    floDownBlockId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ) {
    await updateFloDownBlockAst({
      data: {
        floDownBlockId,
        operation: { kind: "removeSemantic", target },
      },
    });

    await invalidateModule();
    setSemanticPanelOpen(false);
    setSemanticPanelFloDownBlockId(null);
  }

  function handleRightSelection(extractId: string) {
    const extract = extracts.find((e) => e.id === extractId);
    if (!extract) return;

    setFutureRepo(extract.futureRepo);
    setFilePath(extract.filePath);
    setFileName(extract.fileName);
    setLanguage(extract.language);

    clearError("fileName");

    handleSelection("right", {
      extractId,
      afterCommit: () => setLockedByExtractId(extractId),
    });
  }

  async function handleDefiniendumSubmit(params: DefiniendumSubmitParams) {
    if (!floDownBlockExtractId) return;
    if (!validateIdentity()) return;

    if (editingNodeId) {
      let newUri: string;

      if (params.mode === "CREATE") {
        newUri = params.symbolName;
      } else if (params.selectedSymbol.source === "DB") {
        newUri = params.selectedSymbol.symbolName;
      } else {
        const parsed = parseUri(params.selectedSymbol.uri);
        newUri = parsed.conceptUri;
      }

      const isDeclared = params.mode === "CREATE";

      const payload: DefiniendumNode = {
        type: "definiendum",
        uri: newUri,
        content: [
          params.mode === "CREATE"
            ? params.symbolName
            : params.selectedSymbol.source === "DB"
              ? params.selectedSymbol.symbolName
              : parseUri(params.selectedSymbol.uri).symbol,
        ],
        symdecl: isDeclared,
      };

      await updateFloDownBlockAst({
        data: {
          floDownBlockId: floDownBlockExtractId,
          operation: {
            kind: "replaceSemantic",
            target: { type: "definiendum", uri: editingNodeId },
            payload,
          },
        },
      });
    } else {
      if (params.mode === "CREATE") {
        const result = await createSymbolDefiniendum({
          data: {
            floDownBlockId: floDownBlockExtractId,
            selectedText: floDownBlockExtractText,
            startOffset: selection!.startOffset,
            endOffset: selection!.endOffset,
            symdecl: true,
            futureRepo: futureRepo.trim(),
            filePath: filePath.trim(),
            fileName: fileName.trim(),
            language: language.trim(),
            symbolName: params.symbolName,
          },
        });
        if (result.linkedExistingSymbol) {
          alert(
            "The existing local symbol was linked instead of creating a duplicate declaration.",
          );
        }
      } else if (params.selectedSymbol.source === "DB") {
        await createSymbolDefiniendum({
          data: {
            floDownBlockId: floDownBlockExtractId,
            selectedText: floDownBlockExtractText,
            startOffset: selection!.startOffset,
            endOffset: selection!.endOffset,
            symdecl: false,
            futureRepo: futureRepo.trim(),
            filePath: filePath.trim(),
            fileName: fileName.trim(),
            language: language.trim(),
            symbolName: "",
            selectedSymbolSource: "DB",
            selectedSymbolId: params.selectedSymbol.id,
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
            futureRepo: futureRepo.trim(),
            filePath: filePath.trim(),
            fileName: fileName.trim(),
            language: language.trim(),
            symbolName: "",
            selectedSymbolSource: "MATHHUB",
            selectedSymbolUri: params.selectedSymbol.uri,
          },
        });
      }
    }

    await invalidateModule();

    setEditingNodeId(null);
    setDefDialogOpen(false);
    setFloDownBlockExtractId(null);
    setFloDownBlockExtractText("");
    clearAll();
  }

  async function handleSaveSymbolicRef(symRef: UnifiedSymbolicReference) {
    if (!floDownBlockExtractId) return;
    setSymbolicRefSaving(true);
    try {
      if (editingNodeId) {
        const { uri } = normalizeSymRef(symRef);

        await updateFloDownBlockAst({
          data: {
            floDownBlockId: floDownBlockExtractId,
            operation: {
              kind: "replaceSemantic",
              target: { type: "symref", uri: editingNodeId },
              payload: {
                type: "symref",
                uri,
              },
            },
          },
        });
      } else {
        if (!selection) return;

        await symbolicRef({
          data: {
            floDownBlockId: floDownBlockExtractId,
            selection: {
              text: selection.text,
              startOffset: selection.startOffset,
              endOffset: selection.endOffset,
            },
            symRef,
          },
        });
      }

      await invalidateModule();
      setEditingNodeId(null);
      setMode(null);
      clearAll();
    } finally {
      setSymbolicRefSaving(false);
    }
  }

  function handleOpenSymbolicRef(extractId: string) {
    if (!selection) return;

    setFloDownBlockExtractId(extractId);
    setConceptUri(selection.text);
    setMode("SymbolicRef");

    clearPopupOnly();
  }

  function handleCloseSymbolicRefDialog() {
    setMode(null);
    setFloDownBlockExtractId(null);
    clearAll();
  }

  async function handleReplaceNode(
    floDownBlockId: string,
    target: { type: "definiendum" | "symref"; uri: string },
    payload: ReplacePayload,
  ) {
    const result = await updateFloDownBlockAst({
      data: {
        floDownBlockId,
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
    await updateFloDownBlock({ data: { id, statement } });
    await invalidateModule();
    setEditingId(null);
  }

  function handleOpenLatexConfig() {
    setLatexConfigOpen(true);
  }

  async function handleLatexConfigSubmit(config: {
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  }) {
    const filteredDefinitions = extracts.filter(
      (e) =>
        e.futureRepo === config.futureRepo &&
        e.filePath === config.filePath &&
        e.fileName === config.fileName &&
        e.language === config.language,
    );

    navigate({
      to: "/create-latex",
      search: {
        documentId: moduleDescriptionId,
        floDownBlockIds: filteredDefinitions.map((e) => e.id),
        futureRepo: config.futureRepo,
        filePath: config.filePath,
        fileName: config.fileName,
        language: config.language,
      },
    });

    setLatexConfigOpen(false);
  }

  function openDefiniendumFromSelection() {
    if (!selection) return;
    const extract = extracts.find((e) => e.id === selection.extractId);
    if (!extract || !supportsDefinienda(extract.statement)) return;
    clearPopupOnly();
    setFloDownBlockExtractId(extract.id);
    setFloDownBlockExtractText(selection.text);
    setDefDialogOpen(true);
  }

  function openSymbolicRefFromSelection() {
    if (!selection) return;
    const extract = extracts.find((e) => e.id === selection.extractId);
    if (!extract) return;
    handleOpenSymbolicRef(extract.id);
  }

  const canOpenDefiniendumFromSelection =
    !!selection?.extractId &&
    (() => {
      const extract = extracts.find((e) => e.id === selection.extractId);
      return !!extract && supportsDefinienda(extract.statement);
    })();

  return {
    editingId,
    lockedByExtractId,
    defDialogOpen,
    setDefDialogOpen,
    floDownBlockExtractText,
    symbolicRefSaving,
    mode,
    conceptUri,
    semanticPanelOpen,
    setSemanticPanelOpen,
    semanticPanelFloDownBlockId,
    setSemanticPanelFloDownBlockId,
    floDownBlockMetaEditOpen,
    setFloDownBlockMetaEditOpen,
    floDownBlockMetaTarget,
    setFloDownBlockMetaTarget,
    deleteTarget,
    deleteLoading,
    setDeleteTarget,
    confirmDeleteDefinition,
    latexConfigOpen,
    setLatexConfigOpen,
    handleOpenSemanticPanel,
    handleDefiniendumSubmit,
    handleSaveSymbolicRef,
    handleReplaceNode,
    handleDeleteNode,
    handleEditFloDownBlockMeta,
    handleRightSelection,
    handleDeleteDefinition,
    handleToggleEdit,
    handleUpdateExtract,
    handleOpenLatexConfig,
    handleLatexConfigSubmit,
    handleCloseSymbolicRefDialog,
    openDefiniendumFromSelection,
    openSymbolicRefFromSelection,
    canOpenDefiniendumFromSelection,
  };
}
