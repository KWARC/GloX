import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { DefinitionIdentityDialog } from "@/components/DefinitionFilePathDialog";
import { ExtractTextDialog } from "@/components/ExtractTextDialog";
import { LatexConfigModel } from "@/components/LatexConfigModel";
import { ReferenceSuggestionDialog } from "@/components/ReferenceSuggestionDialog";
import { SelectionPopup } from "@/components/SelectionPopup";
import { SemanticPanel } from "@/components/SemanticPanel";
import { SymbolicRef } from "@/components/SymbolicRef";
import { DEFAULT_LLM_SYSTEM_PROMPT } from "@/server/prompt";
import { ExtractedItem, PopupState } from "@/server/text-selection";
import {
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { ComponentProps } from "react";

export function FileDialogs({
  popup,
  onClosePopup,
  onExtractSelection,
  onDefiniendumSelection,
  onSymbolicRefSelection,
  mode,
  conceptUri,
  onSaveSymbolicRef,
  onCloseSymbolicRefDialog,
  defDialogOpen,
  defExtractText,
  onCloseDefDialog,
  onDefiniendumSubmit,
  latexConfigOpen,
  onCloseLatexConfig,
  onLatexConfigSubmit,
  extracts,
  semanticPanelOpen,
  onCloseSemanticPanel,
  semanticDefinition,
  onReplaceNode,
  onDeleteNode,
  extractDialogOpen,
  pendingExtractText,
  definitionName,
  setDefinitionName,
  filePathLabel,
  onCloseExtractDialog,
  onExtractSubmit,
  definitionMetaEditOpen,
  onCloseDefinitionMeta,
  definitionMetaTarget,
  definitionInvalidateKey,
  suggestOpen,
  onCloseSuggest,
  activeDefId,
  activeDefStatement,
  activeDefText,
  suggestions,
  sniffyCatalog,
  suggestLoading,
  onAcceptSuggestion,
  recomputeDialogOpen,
  onCloseRecomputeDialog,
  recomputePromptDraft,
  setRecomputePromptDraft,
  llmLoading,
  pagesLength,
  onRecomputeSubmit,
}: {
  popup: PopupState | null;
  onClosePopup: () => void;
  onExtractSelection: () => void;
  onDefiniendumSelection: () => void;
  onSymbolicRefSelection: () => void;
  mode: "SymbolicRef" | null;
  conceptUri: string;
  onSaveSymbolicRef: ComponentProps<typeof SymbolicRef>["onSelect"];
  onCloseSymbolicRefDialog: () => void;
  defDialogOpen: boolean;
  defExtractText: string;
  onCloseDefDialog: () => void;
  onDefiniendumSubmit: ComponentProps<typeof DefiniendumDialog>["onSubmit"];
  latexConfigOpen: boolean;
  onCloseLatexConfig: () => void;
  onLatexConfigSubmit: ComponentProps<typeof LatexConfigModel>["onSubmit"];
  extracts: ExtractedItem[];
  semanticPanelOpen: boolean;
  onCloseSemanticPanel: () => void;
  semanticDefinition: ExtractedItem | null;
  onReplaceNode: ComponentProps<typeof SemanticPanel>["onReplaceNode"];
  onDeleteNode: ComponentProps<typeof SemanticPanel>["onDeleteNode"];
  extractDialogOpen: boolean;
  pendingExtractText: string;
  definitionName: string;
  setDefinitionName: (value: string) => void;
  filePathLabel: string;
  onCloseExtractDialog: () => void;
  onExtractSubmit: ComponentProps<typeof ExtractTextDialog>["onSubmit"];
  definitionMetaEditOpen: boolean;
  onCloseDefinitionMeta: () => void;
  definitionMetaTarget: ExtractedItem | null;
  definitionInvalidateKey: unknown[];
  suggestOpen: boolean;
  onCloseSuggest: () => void;
  activeDefId: string | null;
  activeDefStatement: ComponentProps<
    typeof ReferenceSuggestionDialog
  >["definitionStatement"];
  activeDefText: string;
  suggestions: ComponentProps<typeof ReferenceSuggestionDialog>["suggestions"];
  sniffyCatalog: ComponentProps<typeof ReferenceSuggestionDialog>["catalog"];
  suggestLoading: boolean;
  onAcceptSuggestion: ComponentProps<
    typeof ReferenceSuggestionDialog
  >["onAccept"];
  recomputeDialogOpen: boolean;
  onCloseRecomputeDialog: () => void;
  recomputePromptDraft: string;
  setRecomputePromptDraft: (value: string) => void;
  llmLoading: boolean;
  pagesLength: number;
  onRecomputeSubmit: () => void;
}) {
  return (
    <>
      {popup && (
        <SelectionPopup
          popup={popup}
          onExtract={popup.source === "left" ? onExtractSelection : undefined}
          onDefiniendum={
            popup.source === "right" ? onDefiniendumSelection : undefined
          }
          onSymbolicRef={
            popup.source === "right" ? onSymbolicRefSelection : undefined
          }
          onClose={onClosePopup}
        />
      )}

      {mode === "SymbolicRef" && (
        <SymbolicRef
          conceptUri={conceptUri}
          onSelect={onSaveSymbolicRef}
          onClose={onCloseSymbolicRefDialog}
        />
      )}

      <DefiniendumDialog
        opened={defDialogOpen}
        extractedText={defExtractText}
        onClose={onCloseDefDialog}
        onSubmit={onDefiniendumSubmit}
      />

      <LatexConfigModel
        opened={latexConfigOpen}
        onClose={onCloseLatexConfig}
        onSubmit={onLatexConfigSubmit}
        extracts={extracts}
      />

      <SemanticPanel
        opened={semanticPanelOpen}
        onClose={onCloseSemanticPanel}
        definition={semanticDefinition}
        onReplaceNode={onReplaceNode}
        onDeleteNode={onDeleteNode}
      />

      <ExtractTextDialog
        opened={extractDialogOpen}
        initialText={pendingExtractText}
        definitionName={definitionName}
        setDefinitionName={setDefinitionName}
        filePath={filePathLabel}
        onClose={onCloseExtractDialog}
        onSubmit={onExtractSubmit}
      />

      <DefinitionIdentityDialog
        opened={definitionMetaEditOpen}
        onClose={onCloseDefinitionMeta}
        definition={definitionMetaTarget}
        invalidateKey={definitionInvalidateKey}
      />

      <ReferenceSuggestionDialog
        opened={suggestOpen}
        onClose={onCloseSuggest}
        definitionId={activeDefId ?? ""}
        definitionStatement={activeDefStatement}
        definitionText={activeDefText}
        suggestions={suggestions}
        catalog={sniffyCatalog}
        loading={suggestLoading}
        onAccept={onAcceptSuggestion}
      />

      <Modal
        opened={recomputeDialogOpen}
        onClose={onCloseRecomputeDialog}
        title={
          <Group gap="xs">
            <IconRefresh size={16} color="var(--mantine-color-violet-6)" />
            <Text fw={600} size="md">
              Recompute LLM Suggestions
            </Text>
          </Group>
        }
        size="lg"
        centered
        padding="lg"
        radius="md"
      >
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              System Prompt
            </Text>
            <Text size="xs" c="dimmed">
              This is the exact prompt sent to the LLM together with the full
              document text. Edit it to refine how definitions are detected,
              then click <strong>Recompute</strong>.
            </Text>
          </Stack>

          <Textarea
            value={recomputePromptDraft}
            onChange={(e) => setRecomputePromptDraft(e.currentTarget.value)}
            autosize
            minRows={10}
            styles={{
              input: {
                fontFamily: "monospace",
                fontSize: 12,
                lineHeight: 1.6,
                backgroundColor: "var(--mantine-color-gray-0)",
              },
            }}
          />

          <Group justify="space-between" align="center">
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => setRecomputePromptDraft(DEFAULT_LLM_SYSTEM_PROMPT)}
            >
              Reset to default
            </Button>

            <Group gap="sm">
              <Button
                variant="default"
                onClick={onCloseRecomputeDialog}
                disabled={llmLoading}
              >
                Cancel
              </Button>
              <Button
                leftSection={
                  llmLoading ? <Loader size={12} /> : <IconRefresh size={14} />
                }
                loading={llmLoading}
                disabled={!recomputePromptDraft.trim() || pagesLength === 0}
                onClick={onRecomputeSubmit}
              >
                Recompute
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
