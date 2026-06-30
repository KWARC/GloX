import { ExtractedItem } from "@/server/text-selection";
import {
  ActionIcon,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import {
  IconDog,
  IconPencil,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import { FolderSymlink } from "lucide-react";
import { FtmlPreview } from "./FtmlPreview";

interface ExtractedTextPanelProps {
  isLocked?: boolean;
  compact?: boolean;
  extracts: ExtractedItem[];
  editingId: string | null;
  selectedId: string | null;
  onToggleEdit: (id: string) => void;
  onUpdate: (
    id: string,
    statement: ExtractedItem["statement"],
  ) => Promise<void>;
  onDownload?: (item: ExtractedItem) => void;
  onDelete: (id: string) => void;
  onSelection: (extractId: string) => void;
  onOpenSemanticPanel: (definitionId: string) => void;
  onRecomputeReferences?: (definitionId: string) => void;
  onOpenLatexPreview?: (item: ExtractedItem) => void;
  showPageNumber?: boolean;
  showDefinitionMeta?: boolean;
  onEditDefinitionMeta?: (item: ExtractedItem) => void;
  showDefinitionMetaIconOnly?: boolean;
  showJsonEdit?: boolean;
  showActions?: boolean;
}

export function ExtractedTextPanel({
  extracts,
  editingId,
  selectedId,
  onToggleEdit,
  onUpdate,
  onDelete,
  onSelection,
  onOpenSemanticPanel,
  onRecomputeReferences,
  showPageNumber = true,
  showDefinitionMeta = true,
  showDefinitionMetaIconOnly = false,
  showJsonEdit = true,
  showActions = true,
  onEditDefinitionMeta,
  isLocked = false,
  compact = false,
}: ExtractedTextPanelProps) {
  return (
    <Paper
      withBorder={!compact}
      p={compact ? 0 : "md"}
      h={compact ? "auto" : "100%"}
      radius={compact ? 0 : "md"}
      bg={compact ? "transparent" : "blue.0"}
    >
      <ScrollArea h={compact ? "auto" : "100%"}>
        <Stack gap={compact ? "xs" : "sm"}>
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
                  p={compact ? 6 : "sm"}
                  radius={compact ? "xs" : "md"}
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
                  <Group justify="space-between" mb={compact ? 2 : 4}>
                    {showPageNumber ? (
                      <Text size="xs">
                        {item.pageNumber === null
                          ? `New · ${item.kind}`
                          : `Page ${item.pageNumber} · ${item.kind}`}
                      </Text>
                    ) : (
                      <div />
                    )}

                    {showActions ? (
                      <Group gap={compact ? "xs" : "xs"}>
                        <Tooltip label="Delete definition" withArrow>
                          <ActionIcon
                            size={compact ? 22 : "sm"}
                            color="red"
                            disabled={isLocked}
                            onClick={() => onDelete(item.id)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>

                        {showJsonEdit && (
                          <Tooltip label="Edit JSON format" withArrow>
                            <ActionIcon
                              size={compact ? 22 : "sm"}
                              variant="subtle"
                              disabled={isLocked}
                              onClick={() => onToggleEdit(item.id)}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}

                        {onRecomputeReferences && (
                          <Tooltip label="sn-ify" withArrow>
                            <ActionIcon
                              size={compact ? 22 : "sm"}
                              variant="subtle"
                              color="teal"
                              disabled={isLocked}
                              onClick={() => onRecomputeReferences(item.id)}
                            >
                              <IconDog size={15} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="Manage semantics" withArrow>
                          <ActionIcon
                            size={compact ? 22 : "sm"}
                            variant="subtle"
                            disabled={isLocked}
                            onClick={() => onOpenSemanticPanel(item.id)}
                          >
                            <IconSettings size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    ) : (
                      <div />
                    )}
                  </Group>

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
                          const parsed = JSON.parse(
                            e.currentTarget.value,
                          ) as ExtractedTextPanelProps["extracts"][number]["statement"];
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
                        docId={item.id}
                        ftmlAst={item.statement}
                      />

                      {/* <SuggestedDefinienda item={item} /> */}
                    </div>
                  )}

                  {showDefinitionMeta && (
                    <Tooltip label="Move file path" withArrow>
                      <Group
                        gap={compact ? 4 : 6}
                        mt={compact ? 3 : 6}
                        title={`Archive: ${item.futureRepo} | Module Path: ${item.filePath} | Module: ${item.fileName} | Lang: ${item.language}`}
                        style={{
                          cursor: onEditDefinitionMeta ? "pointer" : "default",
                        }}
                        onClick={() => onEditDefinitionMeta?.(item)}
                      >
                        <FolderSymlink size={14} />
                        {!showDefinitionMetaIconOnly && (
                          <Text size="10px" c="dimmed" ff="monospace">
                            [{item.futureRepo}] [{item.filePath}] [{item.fileName}
                            ] [{item.language}]
                          </Text>
                        )}
                      </Group>
                    </Tooltip>
                  )}
                </Paper>
              );
            })
          )}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
