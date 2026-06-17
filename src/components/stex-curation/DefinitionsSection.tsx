import { ExtractedItem } from "@/server/text-selection";
import { FtmlStatement } from "@/types/ftml.types";
import { Box, Group, Loader, Stack } from "@mantine/core";
import { ExtractedTextPanel } from "../ExtractedTextList";

export type DefinitionsSectionProps = {
  data: {
    definitions: ExtractedItem[];
    isLoading: boolean;
  };
  state: {
    editingId: string | null;
    isLocked: boolean;
  };
  actions: {
    onToggleEdit: (id: string) => void;
    onUpdate: (id: string, statement: FtmlStatement) => Promise<void>;
    onDownload: () => void;
    onDelete: (id: string) => void;
    onSelection: (extractId: string) => void;
    onOpenSemanticPanel: (definitionId: string) => void;
    onRecomputeReferences: (definitionId: string) => void;
    onEditDefinitionMeta: (item: ExtractedItem) => void;
    onOpenLatexPreview: () => void;
  };
};

export function DefinitionsSection({
  data,
  state,
  actions,
}: DefinitionsSectionProps) {
  return (
    <Box py={2}>
      {data.isLoading && (
        <Group justify="center" py="lg">
          <Loader size="sm" />
        </Group>
      )}

      {!data.isLoading && (
        <Stack gap="xs">
          <ExtractedTextPanel
            extracts={data.definitions}
            editingId={state.editingId}
            selectedId={null}
            onToggleEdit={actions.onToggleEdit}
            onUpdate={actions.onUpdate}
            onDownload={actions.onDownload}
            onDelete={actions.onDelete}
            onSelection={actions.onSelection}
            onOpenSemanticPanel={actions.onOpenSemanticPanel}
            onRecomputeReferences={actions.onRecomputeReferences}
            showPageNumber={false}
            showDefinitionMeta
            showDefinitionMetaIconOnly
            onEditDefinitionMeta={actions.onEditDefinitionMeta}
            isLocked={state.isLocked}
            onOpenLatexPreview={actions.onOpenLatexPreview}
          />
        </Stack>
      )}
    </Box>
  );
}
