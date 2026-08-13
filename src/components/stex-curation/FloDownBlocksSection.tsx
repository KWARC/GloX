import { ExtractedItem } from "@/server/text-selection";
import { FloDownStatement } from "@/types/floDown.types";
import { Box, Group, Loader, Stack } from "@mantine/core";
import { ExtractedTextPanel } from "../ExtractedTextList";

export type FloDownBlocksSectionProps = {
  data: {
    floDownBlocks: ExtractedItem[];
    isLoading: boolean;
  };
  state: {
    editingId: string | null;
    isLocked: boolean;
  };
  actions: {
    onToggleEdit: (id: string) => void;
    onUpdate: (id: string, statement: FloDownStatement) => Promise<void>;
    onDownload: () => void;
    onDelete: (id: string) => void;
    onSelection: (extractId: string) => void;
    onOpenSemanticPanel: (floDownBlockId: string) => void;
    onRecomputeReferences: (floDownBlockId: string) => void;
    onEditFloDownBlockMeta: (item: ExtractedItem) => void;
    onOpenLatexPreview: () => void;
  };
};

export function FloDownBlocksSection({
  data,
  state,
  actions,
}: FloDownBlocksSectionProps) {
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
            compact
            extracts={data.floDownBlocks}
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
            showFloDownBlockMeta
            showFloDownBlockMetaIconOnly
            onEditFloDownBlockMeta={actions.onEditFloDownBlockMeta}
            isLocked={state.isLocked}
            onOpenLatexPreview={actions.onOpenLatexPreview}
          />
        </Stack>
      )}
    </Box>
  );
}
