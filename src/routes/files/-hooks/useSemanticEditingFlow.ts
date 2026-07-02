import { queryClient } from "@/queryClient";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { normalizeSymRef, parseUri, ReplacePayload } from "@/server/parseUri";
import {
  ExtractedItem,
  TextSelection,
  useExtractionActions,
  useValidation,
} from "@/server/text-selection";
import { SymbolSearchResult } from "@/server/useSymbolSearch";
import { deleteDefinition } from "@/serverFns/extractDefinition.server";
import { createSymbolDefiniendum } from "@/serverFns/symbol.server";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import { updateDefinitionAst } from "@/serverFns/updateDefinition.server";
import { DefiniendumNode, FtmlStatement } from "@/types/ftml.types";
import { supportsDefinienda } from "@/types/paragraphKind";
import { NavigateOptions, RegisteredRouter } from "@tanstack/react-router";
import { useState } from "react";

type DefiniendumSubmitParams =
  | {
      mode: "CREATE";
      symbolName: string;
      verbalization: string;
      symdecl: true;
    }
  | { mode: "PICK_EXISTING"; selectedSymbol: SymbolSearchResult };

export function useSemanticEditingFlow({
  documentId,
  extracts,
  selection,
  handleSelection,
  clearPopupOnly,
  clearAll,
  navigate,
}: {
  documentId: string;
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
  navigate: (opts: NavigateOptions<RegisteredRouter>) => void;
}) {
  const [futureRepo, setFutureRepo] = useState("smglom/softeng");
  const [filePath, setFilePath] = useState("mod");
  const [fileName, setFileName] = useState("Software");
  const [language, setLanguage] = useState("en");
  const { validate, clearError } = useValidation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"SymbolicRef" | null>(null);
  const [conceptUri, setConceptUri] = useState<string>("");
  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [defExtractId, setDefExtractId] = useState<string | null>(null);
  const [defExtractText, setDefExtractText] = useState("");
  const [symbolicRefSaving, setSymbolicRefSaving] = useState(false);
  const [lockedByExtractId, setLockedByExtractId] = useState<string | null>(
    null,
  );
  const [latexConfigOpen, setLatexConfigOpen] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const [semanticPanelDefId, setSemanticPanelDefId] = useState<string | null>(
    null,
  );
  const [definitionMetaEditOpen, setDefinitionMetaEditOpen] = useState(false);
  const [definitionMetaTarget, setDefinitionMetaTarget] =
    useState<ExtractedItem | null>(null);
  const { updateExtract } = useExtractionActions(documentId);

  function validateIdentity() {
    return validate(futureRepo, filePath, fileName, language);
  }

  async function handleDeleteDefinition(id: string) {
    if (!confirm("Delete this extracted definition?")) return;

    await deleteDefinition({ data: { id } });
    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });

    if (lockedByExtractId === id) {
      setLockedByExtractId(null);
      setEditingId(null);
    }
  }

  function handleOpenSemanticPanel(definitionId: string) {
    setSemanticPanelDefId(definitionId);
    setSemanticPanelOpen(true);
  }

  function handleEditDefinitionMeta(item: ExtractedItem) {
    setDefinitionMetaTarget(item);
    setFutureRepo(item.futureRepo);
    setFilePath(item.filePath);
    setFileName(item.fileName);
    setLanguage(item.language);
    setDefinitionMetaEditOpen(true);
  }

  async function handleDeleteNode(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ) {
    await updateDefinitionAst({
      data: {
        definitionId,
        operation: { kind: "removeSemantic", target },
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });
    setSemanticPanelOpen(false);
    setSemanticPanelDefId(null);
  }

  function handleRightSelection(extractId: string) {
    const extract = extracts.find((e) => e.id === extractId);
    if (!extract) return;

    setFutureRepo(extract.futureRepo);
    setFilePath(extract.filePath);
    setFileName(extract.fileName);
    setLanguage(extract.language);

    setLockedByExtractId(extractId);
    clearError("fileName");

    handleSelection("right", { extractId });
  }

  async function handleDefiniendumSubmit(params: DefiniendumSubmitParams) {
    if (!defExtractId) return;
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
            ? params.verbalization || params.symbolName
            : params.selectedSymbol.source === "DB"
              ? params.selectedSymbol.symbolName
              : parseUri(params.selectedSymbol.uri).symbol,
        ],
        symdecl: isDeclared,
      };

      await updateDefinitionAst({
        data: {
          definitionId: defExtractId,
          operation: {
            kind: "replaceSemantic",
            target: { type: "definiendum", uri: editingNodeId },
            payload,
          },
        },
      });
    } else {
      if (params.mode === "CREATE") {
        await createSymbolDefiniendum({
          data: {
            definitionId: defExtractId,
            selectedText: defExtractText,
            startOffset: selection!.startOffset,
            endOffset: selection!.endOffset,
            symdecl: true,
            futureRepo: futureRepo.trim(),
            filePath: filePath.trim(),
            fileName: fileName.trim(),
            language: language.trim(),
            symbolName: params.symbolName,
            alias: params.verbalization || null,
          },
        });
      } else if (params.selectedSymbol.source === "DB") {
        await createSymbolDefiniendum({
          data: {
            definitionId: defExtractId,
            selectedText: defExtractText,
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
            definitionId: defExtractId,
            selectedText: defExtractText,
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

      await queryClient.invalidateQueries({
        queryKey: ["definitions", documentId],
      });
    }

    setEditingNodeId(null);
    setDefDialogOpen(false);
    setDefExtractId(null);
    setDefExtractText("");
    clearAll();
  }

  async function handleSaveSymbolicRef(symRef: UnifiedSymbolicReference) {
    if (!defExtractId) return;
    setSymbolicRefSaving(true);
    try {
      if (editingNodeId) {
        const { uri, text } = normalizeSymRef(symRef);

        await updateDefinitionAst({
          data: {
            definitionId: defExtractId,
            operation: {
              kind: "replaceSemantic",
              target: { type: "symref", uri: editingNodeId },
              payload: {
                type: "symref",
                uri,
                content: [text],
              },
            },
          },
        });
      } else {
        if (!selection) return;

        await symbolicRef({
          data: {
            definitionId: defExtractId,
            selection: {
              text: selection.text,
              startOffset: selection.startOffset,
              endOffset: selection.endOffset,
            },
            symRef,
          },
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ["definitions", documentId],
      });
      setEditingNodeId(null);
      setMode(null);
      clearAll();
    } finally {
      setSymbolicRefSaving(false);
    }
  }

  function handleOpenSymbolicRef(extractId: string) {
    if (!selection) return;

    setDefExtractId(extractId);
    setConceptUri(selection.text);
    setMode("SymbolicRef");

    clearPopupOnly();
  }

  function handleCloseSymbolicRefDialog() {
    setMode(null);
    setDefExtractId(null);
    clearAll();
  }

  async function handleReplaceNode(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
    payload: ReplacePayload,
  ) {
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
      queryKey: ["definitions", documentId],
    });

    return result;
  }

  function handleToggleEdit(id: string) {
    setEditingId(editingId === id ? null : id);
  }

  async function handleUpdateExtract(id: string, statement: FtmlStatement) {
    await updateExtract(id, statement);
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
        documentId,
        definitionIds: filteredDefinitions.map((e) => e.id),
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
    if (!extract || !supportsDefinienda(extract.kind)) return;
    clearPopupOnly();
    setDefExtractId(extract.id);
    setDefExtractText(selection.text);
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
      return !!extract && supportsDefinienda(extract.kind);
    })();

  return {
    futureRepo,
    filePath,
    fileName,
    language,
    editingId,
    lockedByExtractId,
    setLockedByExtractId,
    defDialogOpen,
    setDefDialogOpen,
    defExtractId,
    defExtractText,
    symbolicRefSaving,
    mode,
    conceptUri,
    editingNodeId,
    semanticPanelOpen,
    setSemanticPanelOpen,
    semanticPanelDefId,
    setSemanticPanelDefId,
    definitionMetaEditOpen,
    setDefinitionMetaEditOpen,
    definitionMetaTarget,
    setDefinitionMetaTarget,
    latexConfigOpen,
    setLatexConfigOpen,
    validateIdentity,
    handleOpenSemanticPanel,
    handleDefiniendumSubmit,
    handleSaveSymbolicRef,
    handleReplaceNode,
    handleDeleteNode,
    handleEditDefinitionMeta,
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
