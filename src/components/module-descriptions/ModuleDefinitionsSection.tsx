import { ExtractedContentToolbar } from "@/components/files/ExtractedContentToolbar";
import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { FloDownBlockDeleteModal } from "@/components/FloDownBlockReviewModals";
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
import { createModuleDefinitionBlock } from "@/serverFns/moduleDescription.server";
import { listStaticSymbolicCatalog } from "@/serverFns/symbolicCatalog.server";
import { ExtractBlockType } from "@/types/blockType";
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
  const [pendingExtractText, setPendingExtractText] = useState("");
  const [paragraphFileName, setParagraphFileName] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [blockType, setBlockType] = useState<ExtractBlockType>("definition");

  const selectedFloDownBlock =
    extracts.find((e) => e.id === semanticFlow.semanticPanelFloDownBlockId) ??
    null;

  const defsFilePath = definitionBlocks[0]?.filePath ?? "defs";
  const defsFutureRepo =
    definitionBlocks[0]?.futureRepo ?? "courses/FAU/module-descriptions";
  const defsLanguage = definitionBlocks[0]?.language ?? "de";

  function handleCreateSymbolTarget() {
    const conceptUri = semanticFlow.conceptUri.trim();
    if (!conceptUri) return;

    setPendingExtractText(conceptUri);
    setParagraphFileName(normalizeContentName(conceptUri));
    setSymbolName(conceptUri);
    setBlockType("definition");
    setExtractDialogOpen(true);
    semanticFlow.handleCloseSymbolicRefDialog();
  }

  async function handleDefinitionSubmit({
    text,
    blockType: submittedBlockType,
    statement: definitionStatement,
  }: {
    text: string;
    blockType: ExtractBlockType;
    statement?: import("@/types/floDown.types").FloDownStatement;
  }) {
    try {
      await createModuleDefinitionBlock({
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
          onCreateDefinition={() => undefined}
          showLatexButton={canPreviewLatex}
          showCreateButton={false}
        />

        <Box style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {extracts.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" p="md">
              No definitions yet. Add one via Symbolic Ref → Create new symbol.
            </Text>
          ) : (
            <ExtractedTextPanel
              extracts={extracts}
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
        filePath={`${defsFutureRepo}/ ${defsFilePath}/ ${defsLanguage}`}
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
        }}
        onSubmit={(payload) => void handleDefinitionSubmit(payload)}
      />
    </>
  );
}
