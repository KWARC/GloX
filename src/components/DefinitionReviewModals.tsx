import { ExtractedItem } from "@/server/text-selection";
import { FtmlPreview } from "./FtmlPreview";
import { Button, Group, Modal, Paper, Stack, Text } from "@mantine/core";
import { getDefinitionDeletionImpact } from "@/serverFns/extractDefinition.server";
import { useQuery } from "@tanstack/react-query";

type DuplicateDefinition = Pick<
  ExtractedItem,
  "id" | "originalText" | "statement" | "pageNumber" | "kind"
>;

export function DuplicateDefinitionModal({
  opened,
  definitions,
  onCancel,
  onConfirm,
}: {
  opened: boolean;
  definitions: DuplicateDefinition[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return <Modal opened={opened} onClose={onCancel} title="Duplicate content file" centered size="lg">
    <Stack>
      <Text size="sm">This repository, path, filename, and language already contain {definitions.length} content item{definitions.length === 1 ? "" : "s"}. Review them before creating another.</Text>
      {definitions.map((definition) => (
        <Stack key={definition.id} gap={2}>
          <Text size="xs" c="dimmed">{definition.pageNumber === null ? "New" : `Page ${definition.pageNumber}`} · {definition.kind}</Text>
          <Paper withBorder bg="blue.0" py={4} px={6}>
            <FtmlPreview docId={`duplicate-review-${definition.id}`} ftmlAst={definition.statement} />
          </Paper>
        </Stack>
      ))}
      <Group gap="sm" justify="flex-end">
        <Button variant="default" onClick={onCancel}>Cancel</Button>
        <Button color="orange" onClick={onConfirm}>Create anyway</Button>
      </Group>
    </Stack>
  </Modal>;
}

export function DefinitionDeleteModal({
  definition,
  opened,
  loading = false,
  onCancel,
  onConfirm,
}: {
  definition: ExtractedItem | null;
  opened: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { data: associatedDefinitions = [] } = useQuery({
    queryKey: ["definition-deletion-impact", definition?.id],
    queryFn: () => getDefinitionDeletionImpact({ data: { id: definition!.id } }),
    enabled: opened && !!definition,
  });
  if (!definition) return null;
  return <Modal opened={opened} onClose={onCancel} title="Review content deletion" centered size="lg">
    <Stack>
      <Text size="sm">This permanently deletes only the selected content. Associated content below is not deleted.</Text>
      <Text size="sm" fw={600}>Selected content</Text>
      <Paper withBorder bg="blue.0" py={4} px={6}>
        <FtmlPreview docId={`delete-review-${definition.id}`} ftmlAst={definition.statement} />
      </Paper>
      {associatedDefinitions.length > 0 && <>
        <Text size="sm" fw={600}>This content is referenced in the content below</Text>
        {associatedDefinitions.map((associated) => (
          <Paper key={associated.id} withBorder bg="blue.0" py={4} px={6}>
            <FtmlPreview docId={`delete-impact-${associated.id}`} ftmlAst={associated.statement as ExtractedItem["statement"]} />
          </Paper>
        ))}
      </>}
      <Group gap="sm" justify="flex-end">
        <Button variant="default" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button color="red" onClick={onConfirm} loading={loading}>Delete content</Button>
      </Group>
    </Stack>
  </Modal>;
}
