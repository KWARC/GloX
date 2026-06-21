import { DocumentPagesPanel } from "@/components/DocumentPagesPanel";
import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { MyDocument } from "@/queries/document";
import { ExtractedItem } from "@/server/text-selection";
import { FtmlStatement } from "@/types/ftml.types";
import { LlmSuggestion } from "@/types/llm.types";
import { Badge, Box, Flex, Paper, Tabs } from "@mantine/core";
import { IconFileText, IconList } from "@tabler/icons-react";
import { DocumentPage } from "generated/prisma/browser";
import { ReactNode } from "react";
import { ExtractedContentToolbar } from "./ExtractedContentToolbar";
import { FileDocumentToolbar } from "./FileDocumentToolbar";

export type DocumentPanelProps = {
  documentId: string;
  document: MyDocument;
  pages: DocumentPage[];
  llmButtons: ReactNode;
  llmSuggestions: Record<string, LlmSuggestion[]>;
  llmEnabled: boolean;
  focusedSuggestionId: string | null;
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
  showJsonEdit?: boolean;
  showLatexButton?: boolean;
};

export type ResponsiveProps = {
  isMobile: boolean;
  isTablet: boolean;
  activeTab: string | null;
  setActiveTab: (tab: string | null) => void;
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
    llmButtons,
    llmSuggestions,
    llmEnabled,
    focusedSuggestionId,
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
    showJsonEdit = true,
    showLatexButton = true,
  } = extractsPanel;
  const { isMobile, isTablet, activeTab, setActiveTab } = responsive;

  if (isMobile) {
    return (
      <Paper
        flex={1}
        shadow="xs"
        withBorder
        radius="md"
        style={{
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Box
            px="sm"
            pt="xs"
            style={{
              borderBottom: "1px solid var(--mantine-color-gray-2)",
            }}
          >
            <Tabs.List mb="xs">
              <Tabs.Tab
                value="document"
                leftSection={<IconFileText size={15} />}
                fw={500}
              >
                {document.filename}
              </Tabs.Tab>
              <Tabs.Tab
                value="extracts"
                leftSection={<IconList size={15} />}
                fw={500}
                rightSection={
                  extracts.length > 0 ? (
                    <Badge size="xs" variant="filled" color="blue" circle>
                      {extracts.length}
                    </Badge>
                  ) : undefined
                }
              >
                Extracts
              </Tabs.Tab>
            </Tabs.List>

            {activeTab === "document" && <Box pb="xs">{llmButtons}</Box>}
            {activeTab === "extracts" && (
              <Box pb="xs">
                <ExtractedContentToolbar
                  extractCount={extracts.length}
                  onOpenLatexConfig={onOpenLatexConfig}
                  onCreateDefinition={onCreateDefinition}
                  showLatexButton={showLatexButton}
                />
              </Box>
            )}
          </Box>

          <Tabs.Panel
            value="document"
            pt="xs"
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <DocumentPagesPanel
              documentId={documentId}
              pages={pages}
              onSelection={onDocumentSelection}
              llmSuggestions={llmSuggestions}
              llmEnabled={llmEnabled}
              focusedSuggestionId={focusedSuggestionId}
              onLlmSuggestionClick={onLlmSuggestionClick}
            />
          </Tabs.Panel>

          <Tabs.Panel
            value="extracts"
            pt="xs"
            style={{
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
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
              showJsonEdit={showJsonEdit}
            />
          </Tabs.Panel>
        </Tabs>
      </Paper>
    );
  }

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
            onSelection={onDocumentSelection}
            llmSuggestions={llmSuggestions}
            llmEnabled={llmEnabled}
            focusedSuggestionId={focusedSuggestionId}
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
            showJsonEdit={showJsonEdit}
          />
        </Box>
      </Paper>
    </Flex>
  );
}
