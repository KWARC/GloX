import { CreateSymbolDefiniendumDialog } from "@/components/CreateSymbolDefiniendumDialog";
import {
  ExtractTextDialog,
  normalizeContentName,
} from "@/components/ExtractTextDialog";
import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { ReferenceSuggestionDialog } from "@/components/ReferenceSuggestionDialog";
import { SelectionPopup } from "@/components/SelectionPopup";
import { SemanticPanel } from "@/components/semantic-panel/SemanticPanel";
import { SymbolicRef } from "@/components/SymbolicRef";
import { statementHasDeclaredSymbol } from "@/hooks/useDraftSemanticAuthoring";
import {
  useModuleStatementSemantics,
  useModuleStatementSniffyFlow,
} from "@/hooks/module-descriptions/useModuleStatementSemantics";
import {
  moduleStatementExtractId,
  moduleStatementsToExtractedItems,
  type ModuleStatementField,
} from "@/lib/moduleStatementExtracts";
import { buildStaticCatalog } from "@/server/symbolic-suggestions";
import { useTextSelection } from "@/server/text-selection";
import {
  CreatedSymbolTarget,
  declareCreatedSymbolDefiniendum,
} from "@/serverFns/createFloDownBlockWithDeclaredSymbol.server";
import { createModuleDefinitionBlock } from "@/serverFns/moduleDescription.server";
import { listStaticSymbolicCatalog } from "@/serverFns/symbolicCatalog.server";
import { FloDownStatement } from "@/types/floDown.types";
import { ExtractBlockType } from "@/types/blockType";
import { Stack, Title } from "@mantine/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";

const STATEMENT_LABELS: Record<ModuleStatementField, string> = {
  titleStatement: "Title",
  inhaltStatement: "Inhalt",
  lernzieleStatement: "Lernziele und Kompetenzen",
};

type ModuleStatementsSectionProps = {
  moduleId: string;
  moduleDescriptionId: string;
  titleStatement: FloDownStatement;
  inhaltStatement: FloDownStatement;
  lernzieleStatement: FloDownStatement;
  futureRepo: string;
  modulesFilePath: string;
  defsFilePath: string;
  language: string;
};

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

export function ModuleStatementsSection({
  moduleId,
  moduleDescriptionId,
  titleStatement,
  inhaltStatement,
  lernzieleStatement,
  futureRepo,
  modulesFilePath,
  defsFilePath,
  language,
}: ModuleStatementsSectionProps) {
  const queryClient = useQueryClient();
  const { selection, popup, handleSelection, clearPopupOnly, clearAll } =
    useTextSelection();

  const exportIdentity = useMemo(
    () => ({
      futureRepo,
      modulesFilePath,
      language,
    }),
    [futureRepo, modulesFilePath, language],
  );

  const extracts = useMemo(
    () =>
      moduleStatementsToExtractedItems({
        moduleDescriptionId,
        moduleId,
        titleStatement,
        inhaltStatement,
        lernzieleStatement,
        exportIdentity,
      }),
    [
      moduleDescriptionId,
      moduleId,
      titleStatement,
      inhaltStatement,
      lernzieleStatement,
      exportIdentity,
    ],
  );

  const semanticFlow = useModuleStatementSemantics({
    moduleId,
    extracts,
    selection,
    handleSelection,
    clearPopupOnly,
    clearAll,
  });

  const {
    data: staticCatalogData,
    isLoading: staticCatalogLoading,
    error: staticCatalogQueryError,
    refetch: refetchStaticCatalog,
  } = useQuery({
    queryKey: ["static-symbolic-catalog"],
    queryFn: () => listStaticSymbolicCatalog(),
  });

  const staticCatalogError =
    staticCatalogData === undefined && !staticCatalogLoading
      ? staticCatalogQueryError
      : null;

  const sniffyCatalog = useMemo(
    () => buildStaticCatalog(staticCatalogData ?? []),
    [staticCatalogData],
  );

  const sniffyFlow = useModuleStatementSniffyFlow({
    moduleId,
    moduleDescriptionId,
    exportIdentity,
    extracts,
    sniffyCatalog,
    staticCatalogLoading,
    staticCatalogError,
    retryStaticCatalog: async () => {
      await refetchStaticCatalog();
    },
  });

  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [pendingExtractText, setPendingExtractText] = useState("");
  const [paragraphFileName, setParagraphFileName] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [blockType, setBlockType] = useState<ExtractBlockType>("definition");
  const [createdSymbolTarget, setCreatedSymbolTarget] =
    useState<CreatedSymbolTarget | null>(null);
  const symrefContextRef = useRef<{
    extractId: string;
    conceptUri: string;
  } | null>(null);

  const selectedSemanticBlock =
    extracts.find((e) => e.id === semanticFlow.semanticPanelExtractId) ?? null;

  const symbolicRefHidden = extractDialogOpen || !!createdSymbolTarget;

  function handleCreateSymbolTarget() {
    const conceptUri = semanticFlow.conceptUri.trim();
    if (!conceptUri || !symrefContextRef.current) return;

    setPendingExtractText(conceptUri);
    setParagraphFileName(normalizeContentName(conceptUri));
    setSymbolName(conceptUri);
    setBlockType("definition");
    setCreatedSymbolTarget(null);
    setExtractDialogOpen(true);
    semanticFlow.hideSymbolicRefDialog();
  }

  function reopenSymbolicRefDialog() {
    const context = symrefContextRef.current;
    if (!context) return;
    semanticFlow.reopenSymbolicRef(context.extractId, context.conceptUri);
  }

  function handleSymbolicRefFromSelection() {
    if (!selection?.extractId) return;
    symrefContextRef.current = {
      extractId: selection.extractId,
      conceptUri: selection.text,
    };
    semanticFlow.handleOpenSymbolicRef(selection.extractId);
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
        queryKey: ["module-description", moduleId],
      });
      await queryClient.invalidateQueries({ queryKey: ["symbol-search-db"] });

      setExtractDialogOpen(false);
      setPendingExtractText("");
      setParagraphFileName("");
      setSymbolName("");
      setBlockType("definition");

      if (statementHasDeclaredSymbol(declaredSymbols, symbolName.trim())) {
        setCreatedSymbolTarget(null);
      } else {
        setCreatedSymbolTarget(toCreatedSymbolTarget(created));
      }

      reopenSymbolicRefDialog();
    } catch {
      // keep dialog open on error
    }
  }

  async function handleDeclareCreatedSymbolDefiniendum(definiendumSelection: {
    selectedText: string;
    startOffset: number;
    endOffset: number;
  }) {
    if (!createdSymbolTarget) return;

    await declareCreatedSymbolDefiniendum({
      data: {
        floDownBlockId: createdSymbolTarget.floDownBlock.id,
        symbolId: createdSymbolTarget.symbol.id,
        selectedText: definiendumSelection.selectedText,
        startOffset: definiendumSelection.startOffset,
        endOffset: definiendumSelection.endOffset,
      },
    });

    await queryClient.invalidateQueries({ queryKey: ["symbol-search-db"] });
    await queryClient.invalidateQueries({
      queryKey: ["module-description", moduleId],
    });
    setCreatedSymbolTarget(null);
    reopenSymbolicRefDialog();
  }

  function renderStatementPanel(field: ModuleStatementField) {
    const item = extracts.find(
      (extract) =>
        extract.id === moduleStatementExtractId(moduleDescriptionId, field),
    );
    if (!item) return null;

    return (
      <Stack key={field} gap="xs">
        <Title order={4}>{STATEMENT_LABELS[field]}</Title>
        <ExtractedTextPanel
          compact
          extracts={[item]}
          editingId={semanticFlow.editingId}
          selectedId={semanticFlow.lockedByExtractId}
          onToggleEdit={semanticFlow.handleToggleEdit}
          onUpdate={semanticFlow.handleUpdateExtract}
          onDelete={() => undefined}
          onSelection={semanticFlow.handleRightSelection}
          onOpenSemanticPanel={semanticFlow.handleOpenSemanticPanel}
          onRecomputeReferences={sniffyFlow.handleRecomputeReferences}
          showPageNumber={false}
          showFloDownBlockMeta={false}
          showDelete={false}
          showJsonEdit
        />
      </Stack>
    );
  }

  return (
    <>
      <Stack gap="md">
        {renderStatementPanel("titleStatement")}
        {renderStatementPanel("inhaltStatement")}
        {renderStatementPanel("lernzieleStatement")}
      </Stack>

      {popup && (
        <SelectionPopup
          popup={popup}
          onClose={clearAll}
          onSymbolicRef={
            popup.source === "right"
              ? handleSymbolicRefFromSelection
              : undefined
          }
        />
      )}

      {semanticFlow.mode === "SymbolicRef" && !symbolicRefHidden && (
        <SymbolicRef
          conceptUri={semanticFlow.conceptUri}
          onSelect={semanticFlow.handleSaveSymbolicRef}
          onClose={semanticFlow.handleCloseSymbolicRefDialog}
          onCreateSymbol={handleCreateSymbolTarget}
          loading={semanticFlow.symbolicRefSaving}
        />
      )}

      <SemanticPanel
        opened={semanticFlow.semanticPanelOpen}
        onClose={() => {
          semanticFlow.setSemanticPanelOpen(false);
          semanticFlow.setSemanticPanelExtractId(null);
        }}
        floDownBlock={selectedSemanticBlock}
        onReplaceNode={semanticFlow.handleReplaceNode}
        onDeleteNode={semanticFlow.handleDeleteNode}
      />

      <ReferenceSuggestionDialog
        opened={sniffyFlow.suggestOpen}
        onClose={() => sniffyFlow.setSuggestOpen(false)}
        floDownBlockId={sniffyFlow.activeFloDownBlockId ?? ""}
        floDownBlockStatement={sniffyFlow.activeFloDownBlockStatement}
        originalText={sniffyFlow.activeFloDownBlockText}
        suggestions={sniffyFlow.suggestions}
        catalog={sniffyCatalog}
        loading={sniffyFlow.suggestLoading}
        catalogError={sniffyFlow.catalogError}
        onRetryCatalog={sniffyFlow.handleRetryCatalog}
        onAccept={sniffyFlow.handleAcceptSuggestion}
      />

      <ExtractTextDialog
        opened={extractDialogOpen}
        initialText={pendingExtractText}
        paragraphFileName={paragraphFileName}
        blockType={blockType}
        mode="symbol-target"
        symbolName={symbolName}
        createSymbolFlow
        filePath={`${futureRepo}/ ${defsFilePath}/ ${language}`}
        setParagraphFileName={setParagraphFileName}
        setBlockType={setBlockType}
        setSymbolName={setSymbolName}
        title="Add Content"
        textLabel="Enter Content"
        textPlaceholder="Enter content"
        submitLabel="Add Content"
        onClose={() => {
          setExtractDialogOpen(false);
          setPendingExtractText("");
          setParagraphFileName("");
          setSymbolName("");
          setBlockType("definition");
          reopenSymbolicRefDialog();
        }}
        onSubmit={(payload) => void handleDefinitionSubmit(payload)}
      />

      <CreateSymbolDefiniendumDialog
        opened={!!createdSymbolTarget}
        target={createdSymbolTarget}
        onClose={() => {
          setCreatedSymbolTarget(null);
          reopenSymbolicRefDialog();
        }}
        onConfirm={handleDeclareCreatedSymbolDefiniendum}
      />
    </>
  );
}
