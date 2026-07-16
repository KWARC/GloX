import { DocumentPagesPanel } from "@/components/DocumentPagesPanel";
import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { MarkReferenceItem } from "@/components/MarkedReferenceList";
import { MyDocument } from "@/queries/document";
import { ExtractedItem } from "@/server/text-selection";
import { FtmlStatement } from "@/types/ftml.types";
import { LlmSuggestion } from "@/types/llm.types";
import { Box, Flex, Paper } from "@mantine/core";
import { DocumentPage } from "generated/prisma/browser";
import { ReactNode } from "react";
import { ExtractedContentToolbar } from "./ExtractedContentToolbar";
import { FileDocumentToolbar } from "./FileDocumentToolbar";

export type DocumentPanelProps = {
  documentId: string;
  document: MyDocument;
  pages: DocumentPage[];
  extractsByPageNumber: Record<number, ExtractedItem[]>;
  persistentHighlightsEnabled: boolean;
  markReferencesByPage: Record<string, MarkReferenceItem[]>;
  deletingMarkReferenceId: string | null;
  llmButtons: ReactNode;
  llmSuggestions: Record<string, LlmSuggestion[]>;
  llmEnabled: boolean;
  focusedSuggestionId: string | null;
  sourcePageTarget: { pageNumber: number; requestedAt: number } | null;
  onDeleteMarkReference: (referenceId: string) => Promise<void>;
  onSelection: (pageId: string) => void;
  onLlmSuggestionClick: (suggestion: LlmSuggestion, pageId: string) => void;
};

export type ExtractsPanelProps = {
  extracts: ExtractedItem[];
  editingId: string | null;
  selectedId: string | null;
  onUpdate: (id: string, statement: FtmlStatement) => Promise<void>;
  onDelete: (id: string) => void;
  onSelection: (extractId: string) => void;
  onToggleEdit: (id: string) => void;
  onOpenSemanticPanel: (definitionId: string) => void;
  onRecomputeReferences: (definitionId: string) => void;
  onEditDefinitionMeta: (item: ExtractedItem) => void;
  onOpenLatexConfig: () => void;
  onCreateDefinition: () => void;
  onGoToSourcePage: (pageNumber: number) => void;
  showJsonEdit?: boolean;
  showLatexButton?: boolean;
};

export type ResponsiveProps = {
  isTablet: boolean;
};

export type FileDocumentLayoutProps = {
  documentPanel: DocumentPanelProps;
  extractsPanel: ExtractsPanelProps;
  responsive: ResponsiveProps;
};

export function FileDocumentLayout({
  documentPanel,
  extractsPanel,
  responsive,
}: FileDocumentLayoutProps) {
  const {
    documentId,
    document,
    pages,
    extractsByPageNumber,
    persistentHighlightsEnabled,
    markReferencesByPage,
    deletingMarkReferenceId,
    llmButtons,
    llmSuggestions,
    llmEnabled,
    focusedSuggestionId,
    sourcePageTarget,
    onDeleteMarkReference,
    onSelection: onDocumentSelection,
    onLlmSuggestionClick,
  } = documentPanel;
  const {
    extracts,
    editingId,
    selectedId,
    onUpdate,
    onDelete,
    onSelection: onExtractSelection,
    onToggleEdit,
    onOpenSemanticPanel,
    onRecomputeReferences,
    onEditDefinitionMeta,
    onOpenLatexConfig,
    onCreateDefinition,
    onGoToSourcePage,
    showJsonEdit = true,
    showLatexButton = true,
  } = extractsPanel;
  const { isTablet } = responsive;

  return (
    <Flex
      gap={isTablet ? "md" : "lg"}
      style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
      direction={isTablet ? "column" : "row"}
    >
      <Paper
        flex={isTablet ? undefined : 1}
        shadow="xs"
        withBorder
        radius="md"
        style={{
          minHeight: isTablet ? "50%" : undefined,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <FileDocumentToolbar
          document={document}
          pages={pages}
          llmButtons={llmButtons}
        />

        <Box style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <DocumentPagesPanel
            documentId={documentId}
            pages={pages}
            extractsByPageNumber={extractsByPageNumber}
            persistentHighlightsEnabled={persistentHighlightsEnabled}
            markReferencesByPage={markReferencesByPage}
            deletingMarkReferenceId={deletingMarkReferenceId}
            onDeleteMarkReference={onDeleteMarkReference}
            onSelection={onDocumentSelection}
            llmSuggestions={llmSuggestions}
            llmEnabled={llmEnabled}
            focusedSuggestionId={focusedSuggestionId}
            sourcePageTarget={sourcePageTarget}
            onLlmSuggestionClick={onLlmSuggestionClick}
          />
        </Box>
      </Paper>

      <Paper
        w={isTablet ? undefined : 440}
        shadow="xs"
        withBorder
        radius="md"
        style={{
          minHeight: isTablet ? "50%" : undefined,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ExtractedContentToolbar
          extractCount={extracts.length}
          onOpenLatexConfig={onOpenLatexConfig}
          onCreateDefinition={onCreateDefinition}
          showLatexButton={showLatexButton}
        />

        <Box style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <ExtractedTextPanel
            extracts={extracts}
            editingId={editingId}
            selectedId={selectedId}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSelection={onExtractSelection}
            onToggleEdit={onToggleEdit}
            onOpenSemanticPanel={onOpenSemanticPanel}
            onRecomputeReferences={onRecomputeReferences}
            onEditDefinitionMeta={onEditDefinitionMeta}
            onGoToSourcePage={onGoToSourcePage}
            showJsonEdit={showJsonEdit}
          />
        </Box>
      </Paper>
    </Flex>
  );
}
