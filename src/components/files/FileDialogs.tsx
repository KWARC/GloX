import { CreateSymbolDefiniendumDialog } from "@/components/CreateSymbolDefiniendumDialog";
import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { FloDownBlockIdentityDialog } from "@/components/FloDownBlockFilePathDialog";
import { ExtractTextDialog } from "@/components/ExtractTextDialog";
import { LatexConfigModel } from "@/components/LatexConfigModel";
import { ReferenceSuggestionDialog } from "@/components/ReferenceSuggestionDialog";
import { SelectionPopup } from "@/components/SelectionPopup";
import { SemanticPanel } from "@/components/semantic-panel/SemanticPanel";
import { SymbolicRef } from "@/components/SymbolicRef";
import { FloDownBlockDeleteModal, DuplicateFloDownBlockModal } from "@/components/FloDownBlockReviewModals";
import { DEFAULT_LLM_SYSTEM_PROMPT } from "@/server/prompt";
import { ExtractedItem, PopupState } from "@/server/text-selection";
import type { CreatedSymbolTarget } from "@/serverFns/createFloDownBlockWithDeclaredSymbol.server";
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
import type { GloxDocumentIdentity } from "@/lib/gloxFileIdentity";
import { ComponentProps, Dispatch, SetStateAction } from "react";

export type SelectionDialogProps = {
  popup: PopupState | null;
  onClosePopup: () => void;
  onExtractSelection: () => void;
  onMarkReferenceSelection: () => void;
  onDefiniendumSelection: () => void;
  onSymbolicRefSelection: () => void;
  allowDefiniendumSelection?: boolean;
};

export type SymbolicRefDialogProps = {
  mode: "SymbolicRef" | null;
  conceptUri: string;
  hidden?: boolean;
  loading?: boolean;
  onSave: ComponentProps<typeof SymbolicRef>["onSelect"];
  onClose: () => void;
  onCreateSymbol?: ComponentProps<typeof SymbolicRef>["onCreateSymbol"];
};

export type DefiniendumDialogProps = {
  opened: boolean;
  extractedText: string;
  title?: string;
  pickExistingSubmitLabel?: string;
  createSubmitLabel?: string;
  allowCreateSymbol?: boolean;
  loading?: boolean;
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
  floDownBlock: ExtractedItem | null;
  onReplaceNode: ComponentProps<typeof SemanticPanel>["onReplaceNode"];
  onDeleteNode: ComponentProps<typeof SemanticPanel>["onDeleteNode"];
};

export type ExtractionDialogProps = {
  opened: boolean;
  initialText: string;
  paragraphFileName: string;
  paragraphFileNameDisabled?: boolean;
  blockType: ComponentProps<typeof ExtractTextDialog>["blockType"];
  mode?: ComponentProps<typeof ExtractTextDialog>["mode"];
  symbolName?: string;
  symbolNameDisabled?: boolean;
  setParagraphFileName: Dispatch<SetStateAction<string>>;
  setBlockType: ComponentProps<typeof ExtractTextDialog>["setBlockType"];
  setSymbolName?: Dispatch<SetStateAction<string>>;
  identity: GloxDocumentIdentity;
  location?: ComponentProps<typeof ExtractTextDialog>["location"];
  onClose: () => void;
  onSubmit: ComponentProps<typeof ExtractTextDialog>["onSubmit"];
  title?: string;
  textLabel?: string;
  textPlaceholder?: string;
  submitLabel?: string;
  hideSymbolNameField?: boolean;
  createSymbolFlow?: boolean;
  enableSemanticAuthoring?: boolean;
  semanticEnabled?: boolean;
  setSemanticEnabled?: Dispatch<SetStateAction<boolean>>;
  duplicateFloDownBlocks: Array<{ id: string; originalText: string; statement: ExtractedItem["statement"]; pageNumber: number | null }>;
  onCancelDuplicate: () => void;
  onConfirmDuplicate: () => void;
};

export type CreatedSymbolDefiniendumDialogProps = {
  opened: boolean;
  target: CreatedSymbolTarget | null;
  onClose: () => void;
  onConfirm: ComponentProps<
    typeof CreateSymbolDefiniendumDialog
  >["onConfirm"];
};

export type MetadataDialogProps = {
  opened: boolean;
  onClose: () => void;
  floDownBlock: ExtractedItem | null;
  invalidateKey: unknown[];
};

export type SniffyDialogProps = {
  opened: boolean;
  onClose: () => void;
  activeFloDownBlockId: string | null;
  activeFloDownBlockStatement: ComponentProps<
    typeof ReferenceSuggestionDialog
  >["floDownBlockStatement"];
  activeDeclaredSymbolsInfo?: unknown;
  activeFloDownBlockText: string;
  suggestions: ComponentProps<typeof ReferenceSuggestionDialog>["suggestions"];
  catalog: ComponentProps<typeof ReferenceSuggestionDialog>["catalog"];
  loading: boolean;
  catalogError: string | null;
  onRetryCatalog: () => Promise<void>;
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
  deletion: { floDownBlock: ExtractedItem | null; loading: boolean; onCancel: () => void; onConfirm: () => void };
  selection: SelectionDialogProps;
  symbolicRef: SymbolicRefDialogProps;
  definiendum: DefiniendumDialogProps;
  markReference: DefiniendumDialogProps;
  latex: LatexDialogProps;
  semantic: SemanticDialogProps;
  extraction: ExtractionDialogProps;
  createdSymbolDefiniendum: CreatedSymbolDefiniendumDialogProps;
  metadata: MetadataDialogProps;
  sniffy: SniffyDialogProps;
  recompute: RecomputeDialogProps;
};

export function FileDialogs({
  deletion,
  selection,
  symbolicRef,
  definiendum,
  markReference,
  latex,
  semantic,
  extraction,
  createdSymbolDefiniendum,
  metadata,
  sniffy,
  recompute,
}: FileDialogsProps) {
  return (
    <>
      <FloDownBlockDeleteModal
        opened={!!deletion.floDownBlock}
        floDownBlock={deletion.floDownBlock}
        loading={deletion.loading}
        onCancel={deletion.onCancel}
        onConfirm={deletion.onConfirm}
      />
      {selection.popup && (
        <SelectionPopup
          popup={selection.popup}
          onExtract={
            selection.popup.source === "left"
              ? selection.onExtractSelection
              : undefined
          }
          onMarkReference={
            selection.popup.source === "left"
              ? selection.onMarkReferenceSelection
              : undefined
          }
          onDefiniendum={
            selection.popup.source === "right" && selection.allowDefiniendumSelection
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

      {symbolicRef.mode === "SymbolicRef" && !symbolicRef.hidden && (
        <SymbolicRef
          conceptUri={symbolicRef.conceptUri}
          onSelect={symbolicRef.onSave}
          onClose={symbolicRef.onClose}
          onCreateSymbol={symbolicRef.onCreateSymbol}
          loading={symbolicRef.loading}
        />
      )}

      <DefiniendumDialog
        opened={definiendum.opened}
        extractedText={definiendum.extractedText}
        onClose={definiendum.onClose}
        onSubmit={definiendum.onSubmit}
        title={definiendum.title}
        pickExistingSubmitLabel={definiendum.pickExistingSubmitLabel}
        allowCreateSymbol={definiendum.allowCreateSymbol}
        loading={definiendum.loading}
      />

      <DefiniendumDialog
        opened={markReference.opened}
        extractedText={markReference.extractedText}
        onClose={markReference.onClose}
        onSubmit={markReference.onSubmit}
        title={markReference.title}
        pickExistingSubmitLabel={markReference.pickExistingSubmitLabel}
        createSubmitLabel={markReference.createSubmitLabel}
        allowCreateSymbol={markReference.allowCreateSymbol}
        loading={markReference.loading}
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
        floDownBlock={semantic.floDownBlock}
        onReplaceNode={semantic.onReplaceNode}
        onDeleteNode={semantic.onDeleteNode}
      />

      <ExtractTextDialog
        opened={extraction.opened}
        initialText={extraction.initialText}
        paragraphFileName={extraction.paragraphFileName}
        paragraphFileNameDisabled={extraction.paragraphFileNameDisabled}
        blockType={extraction.blockType}
        mode={extraction.mode}
        symbolName={extraction.symbolName}
        symbolNameDisabled={extraction.symbolNameDisabled}
        setParagraphFileName={extraction.setParagraphFileName}
        setBlockType={extraction.setBlockType}
        setSymbolName={extraction.setSymbolName}
        identity={extraction.identity}
        location={extraction.location}
        onClose={extraction.onClose}
        onSubmit={extraction.onSubmit}
        title={extraction.title}
        textLabel={extraction.textLabel}
        textPlaceholder={extraction.textPlaceholder}
        submitLabel={extraction.submitLabel}
        hideSymbolNameField={extraction.hideSymbolNameField}
        createSymbolFlow={extraction.createSymbolFlow}
        enableSemanticAuthoring={extraction.enableSemanticAuthoring}
        semanticEnabled={extraction.semanticEnabled}
        setSemanticEnabled={extraction.setSemanticEnabled}
      />

      <DuplicateFloDownBlockModal
        opened={extraction.duplicateFloDownBlocks.length > 0}
        floDownBlocks={extraction.duplicateFloDownBlocks}
        onCancel={extraction.onCancelDuplicate}
        onConfirm={extraction.onConfirmDuplicate}
      />

      <CreateSymbolDefiniendumDialog
        opened={createdSymbolDefiniendum.opened}
        target={createdSymbolDefiniendum.target}
        onClose={createdSymbolDefiniendum.onClose}
        onConfirm={createdSymbolDefiniendum.onConfirm}
      />

      <FloDownBlockIdentityDialog
        opened={metadata.opened}
        onClose={metadata.onClose}
        floDownBlock={metadata.floDownBlock}
        invalidateKey={metadata.invalidateKey}
      />

      <ReferenceSuggestionDialog
        opened={sniffy.opened}
        onClose={sniffy.onClose}
        floDownBlockId={sniffy.activeFloDownBlockId ?? ""}
        floDownBlockStatement={sniffy.activeFloDownBlockStatement}
        declaredSymbolsInfo={sniffy.activeDeclaredSymbolsInfo}
        originalText={sniffy.activeFloDownBlockText}
        suggestions={sniffy.suggestions}
        catalog={sniffy.catalog}
        loading={sniffy.loading}
        catalogError={sniffy.catalogError}
        onRetryCatalog={sniffy.onRetryCatalog}
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
