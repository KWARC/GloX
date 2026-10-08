import { floDownDeclareSymbolUri } from "@/lib/floDownDeclareSymbolUri";
import { ExtractedContentToolbar } from "@/components/files/ExtractedContentToolbar";
import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import {
  DuplicateFloDownBlockModal,
  FloDownBlockDeleteModal,
} from "@/components/FloDownBlockReviewModals";
import { FloDownBlockIdentityDialog } from "@/components/FloDownBlockFilePathDialog";
import {
  ExtractTextDialog,
  normalizeContentName,
} from "@/components/ExtractTextDialog";
import { LatexConfigModel } from "@/components/LatexConfigModel";
import { ReferenceSuggestionDialog } from "@/components/ReferenceSuggestionDialog";
import { SelectionPopup } from "@/components/SelectionPopup";
import { SemanticPanel } from "@/components/semantic-panel/SemanticPanel";
import { SymbolicRef } from "@/components/SymbolicRef";
import { useModuleDefinitionSemantics } from "@/hooks/module-descriptions/useModuleDefinitionSemantics";
import { useModuleSniffyFlow } from "@/hooks/module-descriptions/useModuleSniffyFlow";
import {
  moduleDefinitionsToExtractedItems,
  type ModuleDefinitionBlock,
} from "@/lib/moduleDefinitionExtracts";
import { buildStaticCatalog } from "@/server/symbolic-suggestions";
import { useTextSelection } from "@/server/text-selection";
import { findFloDownBlocksByIdentity } from "@/serverFns/extractFloDownBlock.server";
import { createModuleDefinitionBlock } from "@/serverFns/moduleDescription.server";
import type { DeclaredSymbolDraft } from "@/types/declaredSymbolsInfo";
import { FloDownStatement } from "@/types/floDown.types";
import { listStaticSymbolicCatalog } from "@/serverFns/symbolicCatalog.server";
import { ExtractBlockType } from "@/types/blockType";
import type { FloDownSymbolContext } from "@/components/FtmlPreview";
import { Box, Paper, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type ModuleDefinitionsSectionProps = {
  moduleId: string;
  moduleDescriptionId: string;
  definitionBlocks: ModuleDefinitionBlock[];
  canPreviewLatex?: boolean;
};

export function ModuleDefinitionsSection({
  moduleId,
  moduleDescriptionId,
  definitionBlocks,
  canPreviewLatex = false,
}: ModuleDefinitionsSectionProps) {
  const isTablet = useMediaQuery("(max-width: 768px)");
  const queryClient = useQueryClient();
  const { selection, popup, handleSelection, clearPopupOnly, clearAll } =
    useTextSelection();

  const extracts = useMemo(
    () => moduleDefinitionsToExtractedItems(definitionBlocks),
    [definitionBlocks],
  );

  const symbolContext = useMemo((): FloDownSymbolContext | undefined => {
    const first = definitionBlocks[0];
    if (!first) return undefined;
    return {
      futureRepo: first.futureRepo,
      filePath: first.filePath,
      fileName: first.fileName,
      language: first.language,
      hoverDefinitions: definitionBlocks.map((block) => ({
        cacheKey: block.id,
        statement: block.statement,
        declaredSymbols: block.declaredSymbols,
        declaredSymbolsInfo: block.declaredSymbolsInfo,
        futureRepo: block.futureRepo,
        filePath: block.filePath,
        fileName: block.fileName,
        language: block.language,
      })),
    };
  }, [definitionBlocks]);

  const semanticFlow = useModuleDefinitionSemantics({
    moduleId,
    moduleDescriptionId,
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

  const sniffyFlow = useModuleSniffyFlow({
    moduleId,
    extracts,
    sniffyCatalog,
    staticCatalogLoading,
    staticCatalogError,
    retryStaticCatalog: async () => {
      await refetchStaticCatalog();
    },
  });

  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [extractDialogMode, setExtractDialogMode] = useState<
    "definition" | "symbol-target"
  >("definition");
  const [semanticEnabled, setSemanticEnabled] = useState(false);
  const [pendingExtractText, setPendingExtractText] = useState("");
  const [paragraphFileName, setParagraphFileName] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [blockType, setBlockType] = useState<ExtractBlockType>("definition");
  const [duplicateFloDownBlocks, setDuplicateFloDownBlocks] = useState<
    Awaited<ReturnType<typeof findFloDownBlocksByIdentity>>
  >([]);
  const [pendingDefinitionSubmit, setPendingDefinitionSubmit] = useState<{
    text: string;
    blockType: ExtractBlockType;
    statement?: FloDownStatement;
    declaredSymbols?: string[];
    declaredSymbolsInfo?: DeclaredSymbolDraft[];
  } | null>(null);

  const selectedFloDownBlock =
    extracts.find((e) => e.id === semanticFlow.semanticPanelFloDownBlockId) ??
    null;

  const defsFilePath = definitionBlocks[0]?.filePath ?? "defs";
  const defsFutureRepo =
    definitionBlocks[0]?.futureRepo ?? "courses/FAU/module-descriptions";
  const defsLanguage = definitionBlocks[0]?.language ?? "de";

  function resetExtractDialogState() {
    setExtractDialogOpen(false);
    setExtractDialogMode("definition");
    setSemanticEnabled(false);
    setPendingExtractText("");
    setParagraphFileName("");
    setSymbolName("");
    setBlockType("definition");
  }

  function handleCreateDefinition() {
    setPendingExtractText("");
    setParagraphFileName("");
    setSymbolName("");
    setBlockType("definition");
    setExtractDialogMode("definition");
    setSemanticEnabled(false);
    setExtractDialogOpen(true);
  }

  function handleCreateSymbolTarget() {
    const conceptUri = semanticFlow.conceptUri.trim();
    if (!conceptUri) return;

    setPendingExtractText(conceptUri);
    setParagraphFileName(normalizeContentName(conceptUri));
    setSymbolName(conceptUri);
    setBlockType("definition");
    setExtractDialogMode("symbol-target");
    setSemanticEnabled(false);
    setExtractDialogOpen(true);
    semanticFlow.handleCloseSymbolicRefDialog();
  }

  async function performDefinitionSubmit({
    text,
    blockType: submittedBlockType,
    statement: definitionStatement,
    declaredSymbolsInfo,
  }: {
    text: string;
    blockType: ExtractBlockType;
    statement?: FloDownStatement;
    declaredSymbols?: string[];
    declaredSymbolsInfo?: DeclaredSymbolDraft[];
  }) {
    const trimmedSymbolName = symbolName.trim();
    const isSymbolTargetCreate = extractDialogMode === "symbol-target";

    await createModuleDefinitionBlock({
      data: {
        moduleDescriptionId,
        paragraphFileName: paragraphFileName.trim(),
        originalText: text,
        statement: definitionStatement,
        ...(isSymbolTargetCreate
          ? {
              symbolName: trimmedSymbolName,
              symbolUri: await floDownDeclareSymbolUri({
                futureRepo: defsFutureRepo,
                filePath: defsFilePath,
                fileName: paragraphFileName.trim(),
                language: defsLanguage,
                symbolName: trimmedSymbolName,
              }),
            }
          : {
              declaredSymbolsInfo,
            }),
        blockType: submittedBlockType,
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["module-description", moduleId],
    });
    await queryClient.invalidateQueries({ queryKey: ["symbol-search-db"] });

    resetExtractDialogState();
  }

  async function handleDefinitionSubmit(input: {
    text: string;
    blockType: ExtractBlockType;
    statement?: FloDownStatement;
    declaredSymbols?: string[];
    declaredSymbolsInfo?: DeclaredSymbolDraft[];
  }) {
    try {
      const matches = await findFloDownBlocksByIdentity({
        data: {
          futureRepo: defsFutureRepo,
          filePath: defsFilePath,
          fileName: paragraphFileName.trim(),
          language: defsLanguage,
        },
      });
      if (matches.length) {
        setDuplicateFloDownBlocks(matches);
        setPendingDefinitionSubmit(input);
        return;
      }
      await performDefinitionSubmit(input);
    } catch {
      // keep dialog open on error
    }
  }

  async function confirmDuplicateDefinition() {
    if (!pendingDefinitionSubmit) return;
    const input = pendingDefinitionSubmit;
    setDuplicateFloDownBlocks([]);
    setPendingDefinitionSubmit(null);
    try {
      await performDefinitionSubmit(input);
    } catch {
      // keep dialog open on error
    }
  }

  return (
    <>
      <Paper
        w={isTablet ? undefined : 440}
        shadow="xs"
        withBorder
        radius="md"
        style={{
          minHeight: isTablet ? "50%" : undefined,
          height: isTablet ? undefined : "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ExtractedContentToolbar
          extractCount={extracts.length}
          onOpenLatexConfig={semanticFlow.handleOpenLatexConfig}
          onCreateDefinition={handleCreateDefinition}
          showLatexButton={canPreviewLatex}
        />

        <Box style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {extracts.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" p="md">
              No definitions yet. Use + to create one, or add via Symbolic Ref →
              Create new symbol.
            </Text>
          ) : (
            <ExtractedTextPanel
              extracts={extracts}
              symbolContext={symbolContext}
              editingId={semanticFlow.editingId}
              selectedId={semanticFlow.lockedByExtractId}
              onToggleEdit={semanticFlow.handleToggleEdit}
              onUpdate={semanticFlow.handleUpdateExtract}
              onDelete={semanticFlow.handleDeleteDefinition}
              onSelection={semanticFlow.handleRightSelection}
              onOpenSemanticPanel={semanticFlow.handleOpenSemanticPanel}
              onRecomputeReferences={sniffyFlow.handleRecomputeReferences}
              showPageNumber={false}
              showFloDownBlockMeta
              showFloDownBlockMetaIconOnly
              onEditFloDownBlockMeta={semanticFlow.handleEditFloDownBlockMeta}
              showJsonEdit
            />
          )}
        </Box>
      </Paper>

      <FloDownBlockDeleteModal
        opened={!!semanticFlow.deleteTarget}
        floDownBlock={semanticFlow.deleteTarget}
        loading={semanticFlow.deleteLoading}
        onCancel={() => semanticFlow.setDeleteTarget(null)}
        onConfirm={semanticFlow.confirmDeleteDefinition}
      />

      {popup && (
        <SelectionPopup
          popup={popup}
          onClose={clearAll}
          onDefiniendum={
            popup.source === "right" && semanticFlow.canOpenDefiniendumFromSelection
              ? semanticFlow.openDefiniendumFromSelection
              : undefined
          }
          onSymbolicRef={
            popup.source === "right"
              ? semanticFlow.openSymbolicRefFromSelection
              : undefined
          }
        />
      )}

      {semanticFlow.mode === "SymbolicRef" && !extractDialogOpen && (
        <SymbolicRef
          conceptUri={semanticFlow.conceptUri}
          onSelect={semanticFlow.handleSaveSymbolicRef}
          onClose={semanticFlow.handleCloseSymbolicRefDialog}
          onCreateSymbol={handleCreateSymbolTarget}
          loading={semanticFlow.symbolicRefSaving}
        />
      )}

      <DefiniendumDialog
        opened={semanticFlow.defDialogOpen}
        extractedText={semanticFlow.floDownBlockExtractText}
        onClose={() => semanticFlow.setDefDialogOpen(false)}
        onSubmit={semanticFlow.handleDefiniendumSubmit}
      />

      <SemanticPanel
        opened={semanticFlow.semanticPanelOpen}
        onClose={() => {
          semanticFlow.setSemanticPanelOpen(false);
          semanticFlow.setSemanticPanelFloDownBlockId(null);
        }}
        floDownBlock={selectedFloDownBlock}
        onReplaceNode={semanticFlow.handleReplaceNode}
        onDeleteNode={semanticFlow.handleDeleteNode}
      />

      <LatexConfigModel
        opened={semanticFlow.latexConfigOpen}
        onClose={() => semanticFlow.setLatexConfigOpen(false)}
        onSubmit={semanticFlow.handleLatexConfigSubmit}
        extracts={extracts}
      />

      <FloDownBlockIdentityDialog
        opened={semanticFlow.floDownBlockMetaEditOpen}
        onClose={() => {
          semanticFlow.setFloDownBlockMetaEditOpen(false);
          semanticFlow.setFloDownBlockMetaTarget(null);
        }}
        floDownBlock={semanticFlow.floDownBlockMetaTarget}
        invalidateKey={["module-description", moduleId]}
      />

      <ReferenceSuggestionDialog
        opened={sniffyFlow.suggestOpen}
        onClose={sniffyFlow.closeSuggest}
        floDownBlockId={sniffyFlow.activeFloDownBlockId ?? ""}
        floDownBlockStatement={sniffyFlow.activeFloDownBlockStatement}
        declaredSymbolsInfo={sniffyFlow.activeDeclaredSymbolsInfo}
        originalText={sniffyFlow.activeFloDownBlockText}
        suggestions={sniffyFlow.suggestions}
        catalog={sniffyCatalog}
        loading={sniffyFlow.suggestLoading}
        catalogError={sniffyFlow.catalogError}
        onRetryCatalog={sniffyFlow.handleRetryCatalog}
        onAccept={sniffyFlow.handleAcceptSuggestion}
      />

      <DuplicateFloDownBlockModal
        opened={duplicateFloDownBlocks.length > 0}
        floDownBlocks={duplicateFloDownBlocks}
        onCancel={() => {
          setDuplicateFloDownBlocks([]);
          setPendingDefinitionSubmit(null);
        }}
        onConfirm={() => void confirmDuplicateDefinition()}
      />

      <ExtractTextDialog
        opened={extractDialogOpen}
        initialText={pendingExtractText}
        paragraphFileName={paragraphFileName}
        blockType={blockType}
        mode={extractDialogMode}
        symbolName={symbolName}
        createSymbolFlow={extractDialogMode === "symbol-target"}
        enableSemanticAuthoring={extractDialogMode === "definition"}
        semanticEnabled={semanticEnabled}
        setSemanticEnabled={setSemanticEnabled}
        identity={{
          futureRepo: defsFutureRepo,
          filePath: defsFilePath,
          language: defsLanguage,
        }}
        setParagraphFileName={setParagraphFileName}
        setBlockType={setBlockType}
        setSymbolName={setSymbolName}
        title={
          extractDialogMode === "symbol-target" ? "Add Content" : undefined
        }
        textLabel={
          extractDialogMode === "symbol-target" ||
          extractDialogMode === "definition"
            ? "Enter Content"
            : undefined
        }
        textPlaceholder={
          extractDialogMode === "symbol-target" ||
          extractDialogMode === "definition"
            ? "Enter content"
            : undefined
        }
        submitLabel={
          extractDialogMode === "symbol-target" ? "Add Content" : undefined
        }
        onClose={resetExtractDialogState}
        onSubmit={(payload) => void handleDefinitionSubmit(payload)}
      />
    </>
  );
}
