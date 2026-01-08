import { ExtractedItem } from "@/server/text-selection";
import {
  ActionIcon,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";

interface ExtractedTextPanelProps {
  extracts: ExtractedItem[];
  editingId: string | null;
  onToggleEdit: (id: string) => void;
  onUpdate: (id: string, statement: string) => Promise<void>;
  onSelection: () => void;
}

export function ExtractedTextPanel({
  extracts,
  editingId,
  onToggleEdit,
  onUpdate,
  onSelection,
}: ExtractedTextPanelProps) {
  return (
    <Paper withBorder p="md" h="100%" radius="md" bg="blue.0">
      <ScrollArea h="100%">
        <Stack gap="sm">
          {!extracts.length ? (
            <Text size="sm" c="dimmed" ta="center">
              No extracted text yet
            </Text>
          ) : (
            extracts.map((item) => (
              <Paper key={item.id} withBorder p="sm" radius="md">
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed">
                    Page {item.pageNumber}
                  </Text>

                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => onToggleEdit(item.id)}
                  >
                    ✎
                  </ActionIcon>
                </Group>

                {editingId === item.id ? (
                  <Textarea
                    defaultValue={item.statement}
                    autosize
                    onBlur={async (e) => {
                      await onUpdate(item.id, e.currentTarget.value);
                    }}
                  />
                ) : (
                  <Text
                    size="sm"
                    lh={1.6}
                    style={{ userSelect: "text", cursor: "text" }}
                    onMouseUp={onSelection}
                  >
                    {item.statement}
                  </Text>
                )}
                <Text
                  size="10px"
                  c="dimmed"
                  ff="monospace"
                  mt={6}
                >
                  {item.futureRepo}/{item.filePath}/{item.fileName}/{item.language}
                </Text>
              </Paper>
            ))
          )}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}