import { ExtractedItem } from "@/server/text-selection";
import { blockTypeLabel, getTopLevelBlockType } from "@/types/blockType";
import { assertFtmlStatement } from "@/types/ftml.types";
import { getFloDownBlockDeletionImpact } from "@/serverFns/extractFloDownBlock.server";
import { Alert, Button, Group, Modal, Paper, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { FtmlPreview } from "./FtmlPreview";

type DuplicateFloDownBlock = Pick<
  ExtractedItem,
  "id" | "originalText" | "statement" | "pageNumber"
>;

export function DuplicateFloDownBlockModal({
  opened,
  floDownBlocks,
  onCancel,
  onConfirm,
}: {
  opened: boolean;
  floDownBlocks: DuplicateFloDownBlock[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Duplicate content file"
      centered
      size="lg"
    >
      <Stack>
        <Text size="sm">
          This repository, path, filename, and language already contain{" "}
          {floDownBlocks.length} content item{floDownBlocks.length === 1 ? "" : "s"}
          . Review them before creating another.
        </Text>
        {floDownBlocks.map((floDownBlock) => (
          <Stack key={floDownBlock.id} gap={2}>
            <Text size="xs" c="dimmed">
              {floDownBlock.pageNumber === null
                ? "New"
                : `Page ${floDownBlock.pageNumber}`}{" "}
              · {blockTypeLabel(getTopLevelBlockType(floDownBlock.statement))}
            </Text>
            <Paper withBorder bg="blue.0" py={4} px={6}>
              <FtmlPreview
                docId={`duplicate-review-${floDownBlock.id}`}
                ftmlAst={floDownBlock.statement}
              />
            </Paper>
          </Stack>
        ))}
        <Group gap="sm" justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button color="orange" onClick={onConfirm}>
            Create anyway
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function FloDownBlockDeleteModal({
  floDownBlock,
  opened,
  loading = false,
  onCancel,
  onConfirm,
}: {
  floDownBlock: ExtractedItem | null;
  opened: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { data: associatedFloDownBlocks = [] } = useQuery({
    queryKey: ["definition-deletion-impact", floDownBlock?.id],
    queryFn: () =>
      getFloDownBlockDeletionImpact({ data: { id: floDownBlock!.id } }),
    enabled: opened && !!floDownBlock,
  });
  if (!floDownBlock) return null;
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title="Review content deletion"
      centered
      size="lg"
    >
      <Stack>
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
          This permanently deletes the selected content.
        </Alert>
        <Text size="sm" fw={600}>
          Selected content
        </Text>
        <Paper withBorder bg="blue.0" py={4} px={6}>
          <FtmlPreview
            docId={`delete-review-${floDownBlock.id}`}
            ftmlAst={floDownBlock.statement}
          />
        </Paper>
        {associatedFloDownBlocks.length > 0 && (
          <>
            <Text size="sm" fw={600}>
              This content is referenced in the content below
            </Text>
            {associatedFloDownBlocks.map((associated) => (
              <Paper key={associated.id} withBorder bg="blue.0" py={4} px={6}>
                <FtmlPreview
                  docId={`delete-impact-${associated.id}`}
                  ftmlAst={assertFtmlStatement(associated.statement)}
                />
              </Paper>
            ))}
          </>
        )}
        <Group gap="sm" justify="flex-end">
          <Button variant="default" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button color="red" onClick={onConfirm} loading={loading}>
            Delete content
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
