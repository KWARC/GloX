import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { DefinitionIdentityDialog } from "@/components/DefinitionFilePathDialog";
import { ExtractTextDialog } from "@/components/ExtractTextDialog";
import { LatexConfigModel } from "@/components/LatexConfigModel";
import { ReferenceSuggestionDialog } from "@/components/ReferenceSuggestionDialog";
import { SelectionPopup } from "@/components/SelectionPopup";
import { SemanticPanel } from "@/components/semantic-panel/SemanticPanel";
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
import { ComponentProps, Dispatch, SetStateAction } from "react";

export type SelectionDialogProps = {
  popup: PopupState | null;
  onClosePopup: () => void;
  onExtractSelection: () => void;
  onDefiniendumSelection: () => void;
  onSymbolicRefSelection: () => void;
};

export type SymbolicRefDialogProps = {
  mode: "SymbolicRef" | null;
  conceptUri: string;
  onSave: ComponentProps<typeof SymbolicRef>["onSelect"];
  onClose: () => void;
};

export type DefiniendumDialogProps = {
  opened: boolean;
  extractedText: string;
  onClose: () => void;
  onSubmit: ComponentProps<typeof DefiniendumDialog>["onSubmit"];
};

export type LatexDialogProps = {
  opened: boolean;
  onClose: () => void;
  onSubmit: ComponentProps<typeof LatexConfigModel>["onSubmit"];
  extracts: ExtractedItem[];
};

export type SemanticDialogProps = {
  opened: boolean;
  onClose: () => void;
  definition: ExtractedItem | null;
  onReplaceNode: ComponentProps<typeof SemanticPanel>["onReplaceNode"];
  onDeleteNode: ComponentProps<typeof SemanticPanel>["onDeleteNode"];
};

export type ExtractionDialogProps = {
  opened: boolean;
  initialText: string;
  definitionName: string;
  setDefinitionName: Dispatch<SetStateAction<string>>;
  filePath: string;
  onClose: () => void;
  onSubmit: ComponentProps<typeof ExtractTextDialog>["onSubmit"];
};

export type MetadataDialogProps = {
  opened: boolean;
  onClose: () => void;
  definition: ExtractedItem | null;
  invalidateKey: unknown[];
};

export type SniffyDialogProps = {
  opened: boolean;
  onClose: () => void;
  activeDefId: string | null;
  activeDefStatement: ComponentProps<
    typeof ReferenceSuggestionDialog
  >["definitionStatement"];
  activeDefText: string;
  suggestions: ComponentProps<typeof ReferenceSuggestionDialog>["suggestions"];
  catalog: ComponentProps<typeof ReferenceSuggestionDialog>["catalog"];
  loading: boolean;
  onAccept: ComponentProps<typeof ReferenceSuggestionDialog>["onAccept"];
};

export type RecomputeDialogProps = {
  opened: boolean;
  onClose: () => void;
  promptDraft: string;
  setPromptDraft: Dispatch<SetStateAction<string>>;
  llmLoading: boolean;
  pagesLength: number;
  onSubmit: () => void;
};

export type FileDialogsProps = {
  selection: SelectionDialogProps;
  symbolicRef: SymbolicRefDialogProps;
  definiendum: DefiniendumDialogProps;
  latex: LatexDialogProps;
  semantic: SemanticDialogProps;
  extraction: ExtractionDialogProps;
  metadata: MetadataDialogProps;
  sniffy: SniffyDialogProps;
  recompute: RecomputeDialogProps;
};

export function FileDialogs({
  selection,
  symbolicRef,
  definiendum,
  latex,
  semantic,
  extraction,
  metadata,
  sniffy,
  recompute,
}: FileDialogsProps) {
  return (
    <>
      {selection.popup && (
        <SelectionPopup
          popup={selection.popup}
          onExtract={
            selection.popup.source === "left"
              ? selection.onExtractSelection
              : undefined
          }
          onDefiniendum={
            selection.popup.source === "right"
              ? selection.onDefiniendumSelection
              : undefined
          }
          onSymbolicRef={
            selection.popup.source === "right"
              ? selection.onSymbolicRefSelection
              : undefined
          }
          onClose={selection.onClosePopup}
        />
      )}

      {symbolicRef.mode === "SymbolicRef" && (
        <SymbolicRef
          conceptUri={symbolicRef.conceptUri}
          onSelect={symbolicRef.onSave}
          onClose={symbolicRef.onClose}
        />
      )}

      <DefiniendumDialog
        opened={definiendum.opened}
        extractedText={definiendum.extractedText}
        onClose={definiendum.onClose}
        onSubmit={definiendum.onSubmit}
      />

      <LatexConfigModel
        opened={latex.opened}
        onClose={latex.onClose}
        onSubmit={latex.onSubmit}
        extracts={latex.extracts}
      />

      <SemanticPanel
        opened={semantic.opened}
        onClose={semantic.onClose}
        definition={semantic.definition}
        onReplaceNode={semantic.onReplaceNode}
        onDeleteNode={semantic.onDeleteNode}
      />

      <ExtractTextDialog
        opened={extraction.opened}
        initialText={extraction.initialText}
        definitionName={extraction.definitionName}
        setDefinitionName={extraction.setDefinitionName}
        filePath={extraction.filePath}
        onClose={extraction.onClose}
        onSubmit={extraction.onSubmit}
      />

      <DefinitionIdentityDialog
        opened={metadata.opened}
        onClose={metadata.onClose}
        definition={metadata.definition}
        invalidateKey={metadata.invalidateKey}
      />

      <ReferenceSuggestionDialog
        opened={sniffy.opened}
        onClose={sniffy.onClose}
        definitionId={sniffy.activeDefId ?? ""}
        definitionStatement={sniffy.activeDefStatement}
        definitionText={sniffy.activeDefText}
        suggestions={sniffy.suggestions}
        catalog={sniffy.catalog}
        loading={sniffy.loading}
        onAccept={sniffy.onAccept}
      />

      <Modal
        opened={recompute.opened}
        onClose={recompute.onClose}
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
            value={recompute.promptDraft}
            onChange={(e) => recompute.setPromptDraft(e.currentTarget.value)}
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
              onClick={() =>
                recompute.setPromptDraft(DEFAULT_LLM_SYSTEM_PROMPT)
              }
            >
              Reset to default
            </Button>

            <Group gap="sm">
              <Button
                variant="default"
                onClick={recompute.onClose}
                disabled={recompute.llmLoading}
              >
                Cancel
              </Button>
              <Button
                leftSection={
                  recompute.llmLoading ? (
                    <Loader size={12} />
                  ) : (
                    <IconRefresh size={14} />
                  )
                }
                loading={recompute.llmLoading}
                disabled={
                  !recompute.promptDraft.trim() || recompute.pagesLength === 0
                }
                onClick={recompute.onSubmit}
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
