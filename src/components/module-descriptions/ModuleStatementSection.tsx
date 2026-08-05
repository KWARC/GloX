import { CreateSymbolDefiniendumDialog } from "@/components/CreateSymbolDefiniendumDialog";
import {
  ExtractTextDialog,
  normalizeContentName,
} from "@/components/ExtractTextDialog";
import { FtmlPreview } from "@/components/FtmlPreview";
import { SelectionPopup } from "@/components/SelectionPopup";
import { SemanticPanel } from "@/components/semantic-panel/SemanticPanel";
import { SymbolicRef } from "@/components/SymbolicRef";
import { statementHasDeclaredSymbol } from "@/hooks/useDraftSemanticAuthoring";
import { useModuleStatementSemanticEditing } from "@/hooks/useModuleStatementSemanticEditing";
import { ReplacePayload } from "@/server/parseUri";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  CreatedSymbolTarget,
  declareCreatedSymbolDefiniendum,
} from "@/serverFns/createFloDownBlockWithDeclaredSymbol.server";
import {
  createModuleDefinitionBlock,
  updateModuleDescriptionAst,
  updateModuleDescriptionStatement,
} from "@/serverFns/moduleDescription.server";
import { UpdateFloDownBlockAstResult } from "@/serverFns/updateFloDownBlock.server";
import { FloDownStatement } from "@/types/floDown.types";
import { ExtractBlockType } from "@/types/blockType";
import { FloDownBlockSemantic } from "@/types/Semantic.types";
import {
  Alert,
  Box,
  Button,
  Group,
  Paper,
  Text,
  Title,
} from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

type ModuleStatementField =
  | "titleStatement"
  | "inhaltStatement"
  | "lernzieleStatement";

type ModuleExportIdentity = {
  futureRepo: string;
  defsFilePath: string;
  language: string;
};

async function persistStatement(
  moduleDescriptionId: string,
  field: ModuleStatementField,
  statement: FloDownStatement,
) {
  await updateModuleDescriptionStatement({
    data: { moduleDescriptionId, field, statement },
  });
}

function toCreatedSymbolTarget(
  created: Awaited<ReturnType<typeof createModuleDefinitionBlock>>,
): CreatedSymbolTarget {
  return {
    floDownBlock: {
      id: created.id,
      pageNumber: null,
      statement: created.statement,
      futureRepo: created.futureRepo,
      filePath: created.filePath,
      fileName: created.fileName,
      language: created.language,
    },
    symbol: {
      id: created.symbol.id,
      symbolName: created.symbol.symbolName,
      futureRepo: created.futureRepo,
      filePath: created.filePath,
      fileName: created.fileName,
      language: created.language,
    },
  };
}

export function ModuleStatementSection({
  label,
  field,
  moduleDescriptionId,
  statement,
  exportIdentity,
  editable,
  onUpdated,
}: {
  label: string;
  field: ModuleStatementField;
  moduleDescriptionId: string;
  statement: FloDownStatement;
  exportIdentity: ModuleExportIdentity;
  editable: boolean;
  onUpdated: () => void;
}) {
  const queryClient = useQueryClient();
  const selectionContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [symbolicRefOpen, setSymbolicRefOpen] = useState(false);
  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);

  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [pendingExtractText, setPendingExtractText] = useState("");
  const [paragraphFileName, setParagraphFileName] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [blockType, setBlockType] = useState<ExtractBlockType>("definition");
  const [semanticEnabled, setSemanticEnabled] = useState(false);
  const [definitionSaving, setDefinitionSaving] = useState(false);
  const [createdSymbolTarget, setCreatedSymbolTarget] =
    useState<CreatedSymbolTarget | null>(null);

  const semantic = useModuleStatementSemanticEditing(
    statement,
    editable,
    selectionContainerRef,
  );

  const virtualBlockId = `${moduleDescriptionId}:${field}`;
  const floDownBlockSemantic: FloDownBlockSemantic = {
    id: virtualBlockId,
    statement: semantic.statement,
  };

  async function saveStatement(next: FloDownStatement) {
    setSaving(true);
    setError(null);
    try {
      await persistStatement(moduleDescriptionId, field, next);
      onUpdated();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setSaving(false);
    }
  }

  async function handleSymrefSelect(symRef: UnifiedSymbolicReference) {
    try {
      const next = semantic.applySymref(symRef);
      await saveStatement(next);
      setSymbolicRefOpen(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleCreateSymbolTarget() {
    const conceptUri = selectedText.trim();
    if (!conceptUri) return;

    setPendingExtractText(conceptUri);
    setParagraphFileName(normalizeContentName(conceptUri));
    setSymbolName(conceptUri);
    setBlockType("definition");
    setSemanticEnabled(false);
    setCreatedSymbolTarget(null);
    setExtractDialogOpen(true);
  }

  async function handleDefinitionSubmit({
    text,
    blockType: submittedBlockType,
    statement: definitionStatement,
    declaredSymbols,
  }: {
    text: string;
    blockType: ExtractBlockType;
    statement?: FloDownStatement;
    declaredSymbols?: string[];
  }) {
    setDefinitionSaving(true);
    setError(null);
    try {
      const created = await createModuleDefinitionBlock({
        data: {
          moduleDescriptionId,
          paragraphFileName: paragraphFileName.trim(),
          originalText: text,
          statement: definitionStatement,
          symbolName: symbolName.trim(),
          blockType: submittedBlockType,
        },
      });

      await queryClient.invalidateQueries({
        queryKey: ["symbol-search-db"],
      });
      onUpdated();

      setExtractDialogOpen(false);
      setPendingExtractText("");
      setParagraphFileName("");
      setSymbolName("");
      setBlockType("definition");
      setSemanticEnabled(false);

      if (statementHasDeclaredSymbol(declaredSymbols, symbolName.trim())) {
        setCreatedSymbolTarget(null);
      } else {
        setCreatedSymbolTarget(toCreatedSymbolTarget(created));
      }

      setSymbolicRefOpen(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDefinitionSaving(false);
    }
  }

  async function handleDeclareCreatedSymbolDefiniendum(selection: {
    selectedText: string;
    startOffset: number;
    endOffset: number;
  }) {
    if (!createdSymbolTarget) return;

    await declareCreatedSymbolDefiniendum({
      data: {
        floDownBlockId: createdSymbolTarget.floDownBlock.id,
        symbolId: createdSymbolTarget.symbol.id,
        selectedText: selection.selectedText,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["symbol-search-db"],
    });
    onUpdated();
    setCreatedSymbolTarget(null);
    setSymbolicRefOpen(true);
  }

  async function handleReplaceNode(
    _floDownBlockId: string,
    target: { type: "definiendum" | "symref"; uri: string },
    payload: ReplacePayload,
  ): Promise<UpdateFloDownBlockAstResult> {
    const result = await updateModuleDescriptionAst({
      data: {
        moduleDescriptionId,
        field,
        operation: {
          kind: "replaceSemantic",
          target,
          payload,
        },
      },
    });
    onUpdated();
    return result;
  }

  async function handleDeleteNode(
    _floDownBlockId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ) {
    await updateModuleDescriptionAst({
      data: {
        moduleDescriptionId,
        field,
        operation: {
          kind: "removeSemantic",
          target,
        },
      },
    });
    onUpdated();
  }

  const selectedText =
    semantic.selectionRef.current?.selectedText ??
    semantic.selection?.selectedText ??
    "";

  const symbolicRefHidden = extractDialogOpen || !!createdSymbolTarget;

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" mb="sm">
        <Title order={4}>{label}</Title>
        {editable && semantic.hasSemantics && (
          <Button
            size="xs"
            variant="light"
            onClick={() => setSemanticPanelOpen(true)}
          >
            Manage semantics
          </Button>
        )}
      </Group>

      {editable && (
        <Text size="xs" c="dimmed" mb="sm">
          Select text in the preview, choose Symbolic Ref, and create a new symbol
          if needed.
        </Text>
      )}

      <Box
        ref={selectionContainerRef}
        onMouseUp={editable ? semantic.handleSelectionMouseUp : undefined}
        style={
          editable
            ? {
                maxHeight: 360,
                overflow: "auto",
                userSelect: "text",
                cursor: "text",
              }
            : undefined
        }
      >
        <FtmlPreview
          ftmlAst={semantic.statement}
          docId={`${moduleDescriptionId}-${field}`}
        />
      </Box>

      {semantic.popup && (
        <SelectionPopup
          popup={semantic.popup}
          onClose={semantic.clearSelection}
          onSymbolicRef={() => {
            semantic.clearPopup();
            setSymbolicRefOpen(true);
          }}
        />
      )}

      {error && (
        <Alert color="red" mt="sm" title="Could not save semantics">
          {error}
        </Alert>
      )}

      {(saving || definitionSaving) && (
        <Text size="xs" c="dimmed" mt="xs">
          Saving…
        </Text>
      )}

      {symbolicRefOpen && !symbolicRefHidden && (
        <SymbolicRef
          conceptUri={selectedText}
          onSelect={handleSymrefSelect}
          onClose={() => setSymbolicRefOpen(false)}
          onCreateSymbol={handleCreateSymbolTarget}
          loading={saving}
        />
      )}

      <ExtractTextDialog
        opened={extractDialogOpen}
        initialText={pendingExtractText}
        paragraphFileName={paragraphFileName}
        blockType={blockType}
        mode="symbol-target"
        symbolName={symbolName}
        createSymbolFlow
        filePath={`${exportIdentity.futureRepo}/ ${exportIdentity.defsFilePath}/ ${exportIdentity.language}`}
        setParagraphFileName={setParagraphFileName}
        setBlockType={setBlockType}
        setSymbolName={setSymbolName}
        title="Add Content"
        textLabel="Enter Content"
        textPlaceholder="Enter content"
        submitLabel="Add Content"
        enableSemanticAuthoring
        semanticEnabled={semanticEnabled}
        setSemanticEnabled={setSemanticEnabled}
        onClose={() => {
          setExtractDialogOpen(false);
          setPendingExtractText("");
          setParagraphFileName("");
          setSymbolName("");
          setBlockType("definition");
          setSemanticEnabled(false);
          setSymbolicRefOpen(true);
        }}
        onSubmit={handleDefinitionSubmit}
      />

      <CreateSymbolDefiniendumDialog
        opened={!!createdSymbolTarget}
        target={createdSymbolTarget}
        onClose={() => {
          setCreatedSymbolTarget(null);
          setSymbolicRefOpen(true);
        }}
        onConfirm={handleDeclareCreatedSymbolDefiniendum}
      />

      <SemanticPanel
        opened={semanticPanelOpen}
        onClose={() => setSemanticPanelOpen(false)}
        floDownBlock={floDownBlockSemantic}
        onReplaceNode={handleReplaceNode}
        onDeleteNode={handleDeleteNode}
      />
    </Paper>
  );
}
