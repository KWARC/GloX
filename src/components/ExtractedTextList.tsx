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
import { IconPencil, IconSettings, IconTrash } from "@tabler/icons-react";
import { FtmlPreview } from "./FtmlPreview";

interface ExtractedTextPanelProps {
  extracts: ExtractedItem[];
  editingId: string | null;
  selectedId: string | null;
  onToggleEdit: (id: string) => void;
  onUpdate: (id: string, statement: string) => Promise<void>;
  onDelete: (id: string) => void;
  onSelection: (extractId: string) => void;
  floDownEnabled?: boolean;
  onOpenSemanticPanel: (definitionId: string) => void;
}

export function ExtractedTextPanel({
  extracts,
  editingId,
  selectedId,
  onToggleEdit,
  onUpdate,
  onDelete,
  onSelection,
  floDownEnabled = true,
  onOpenSemanticPanel,
}: ExtractedTextPanelProps) {
  return (
    <Paper withBorder p="md" h="100%" radius="md" bg="blue.0">
      <ScrollArea h="100%">
        <Stack gap="sm">
          {!extracts.length ? (
            <Text size="sm" c="dark" ta="center">
              No extracted text yet
            </Text>
          ) : (
            extracts.map((item) => {
              const isSelected = item.id === selectedId;
              const isEditing = item.id === editingId;

              return (
                <Paper
                  key={item.id}
                  withBorder
                  p="sm"
                  radius="md"
                  bg={isEditing ? "yellow.0" : undefined}
                  style={{
                    borderColor: isEditing
                      ? "var(--mantine-color-yellow-6)"
                      : isSelected
                        ? "var(--mantine-color-blue-6)"
                        : undefined,
                    borderWidth: isEditing || isSelected ? 2 : undefined,
                  }}
                >
                  {/* HEADER */}
                  <Group justify="space-between" mb={4}>
                    <Text size="xs">Page {item.pageNumber}</Text>

                    <Group gap="xs">
                      <ActionIcon
                        size="sm"
                        color="red"
                        onClick={() => onDelete(item.id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>

                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => onToggleEdit(item.id)}
                      >
                        <IconPencil size={16} />
                      </ActionIcon>

                      {/* SETTINGS */}
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        onClick={() => onOpenSemanticPanel(item.id)}
                      >
                        <IconSettings size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  {/* PREVIEW / JSON */}
                  {isEditing ? (
                    <Textarea
                      defaultValue={JSON.stringify(item.statement, null, 2)}
                      autosize
                      minRows={4}
                      styles={{
                        input: { fontFamily: "monospace", fontSize: 11 },
                      }}
                      onBlur={async (e) => {
                        try {
                          const parsed = JSON.parse(e.currentTarget.value);
                          await onUpdate(item.id, parsed);
                        } catch {
                          alert("Invalid FTML JSON");
                        }
                      }}
                    />
                  ) : (
                    <div
                      style={{ userSelect: "text", cursor: "text" }}
                      onMouseUp={() => onSelection(item.id)}
                    >
                      <FtmlPreview
                       key={item.id}   
                        ftmlAst={item.statement}
                        interactive={floDownEnabled}
                      />
                    </div>
                  )}

                  <Text size="10px" c="dimmed" ff="monospace" mt={6}>
                    {item.futureRepo}/{item.filePath}/{item.fileName}/
                    {item.language}
                  </Text>
                </Paper>
              );
            })
          )}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
