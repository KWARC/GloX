import { ActionIcon, Box, Text, Textarea, Group } from "@mantine/core";
import { IconEdit, IconCheck } from "@tabler/icons-react";

export function ExtractedTextList({
  items,
  editingId,
  onEdit,
  onSave,
}: {
  items: any[];
  editingId: string | null;
  onEdit: (id: string) => void;
  onSave: (id: string, value: string) => void;
}) {
  return (
    <Box>
      {items.map((item) => (
        <Box key={item.id} p="sm" mb="xs" style={{ border: "1px solid #ddd", borderRadius: 8 }}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">
              Page {item.pageNumber}
            </Text>

            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => onEdit(item.id)}
            >
              {editingId === item.id ? <IconCheck /> : <IconEdit />}
            </ActionIcon>
          </Group>

          {editingId === item.id ? (
            <Textarea
              value={item.statement}
              onChange={(e) =>
                onSave(item.id, e.currentTarget.value)
              }
              autosize
            />
          ) : (
            <Text size="sm" lh={1.6}>
              {item.statement}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
