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
import { useMediaQuery } from "@mantine/hooks";
import { useState } from "react";
import {
  IconDog,
  IconArrowLeft,
  IconDeviceFloppy,
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
  onGoToSourcePage?: (pageNumber: number) => void;
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
  onGoToSourcePage,
  onEditDefinitionMeta,
  isLocked = false,
  compact = false,
}: ExtractedTextPanelProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [jsonDrafts, setJsonDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  function openJsonEditor(item: ExtractedItem) {
    setJsonDrafts((current) => ({
      ...current,
      [item.id]: JSON.stringify(item.statement, null, 2),
    }));
    onToggleEdit(item.id);
  }

  async function saveJsonEditor(item: ExtractedItem) {
    try {
      const statement = JSON.parse(
        jsonDrafts[item.id] ?? JSON.stringify(item.statement),
      ) as ExtractedItem["statement"];

      setSavingId(item.id);
      await onUpdate(item.id, statement);
      setJsonDrafts((current) => {
        const { [item.id]: _, ...remaining } = current;
        return remaining;
      });
    } catch {
      alert("Invalid FTML JSON");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Paper
      withBorder={!compact}
      p={compact ? 0 : "md"}
      h={compact ? "auto" : "100%"}
      radius="md"
      bg={compact ? "transparent" : "blue.0"}
    >
      <ScrollArea h={compact ? "auto" : "100%"}>
        <Stack gap={compact ? "xs" : "sm"}>
          {!extracts.length ? (
            <Text size={isMobile ? "md" : "sm"} c="dark" ta="center">
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
                  <Group justify="space-between" mb={compact ? 2 : 4}>
                    {showPageNumber ? (
                      <Text size={isMobile ? "sm" : "xs"}>
                        {item.pageNumber === null
                          ? `New · ${item.kind}`
                          : `Page ${item.pageNumber} · ${item.kind}`}
                      </Text>
                    ) : (
                      <div />
                    )}

                    {showActions ? (
                      <Group gap={compact ? "xs" : "xs"}>
                        {item.pageNumber !== null && onGoToSourcePage && (
                          <Tooltip label="Go to source page" withArrow>
                            <ActionIcon
                              size={compact ? 22 : isMobile ? "md" : "sm"}
                              variant="subtle"
                              color="blue"
                              onClick={() => onGoToSourcePage(item.pageNumber!)}
                            >
                              <IconArrowLeft size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="Delete content" withArrow>
                          <ActionIcon
                            size={compact ? 22 : isMobile ? "md" : "sm"}
                            color="red"
                            disabled={isLocked}
                            onClick={() => onDelete(item.id)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>

                        {showJsonEdit && (
                          <Tooltip
                            label={
                              isEditing
                                ? "Save JSON changes"
                                : "Edit JSON format"
                            }
                            withArrow
                          >
                            <ActionIcon
                              size={compact ? 22 : isMobile ? "md" : "sm"}
                              variant="subtle"
                              color={isEditing ? "blue" : undefined}
                              disabled={isLocked || savingId === item.id}
                              loading={savingId === item.id}
                              onClick={() =>
                                isEditing
                                  ? void saveJsonEditor(item)
                                  : openJsonEditor(item)
                              }
                            >
                              {isEditing ? (
                                <IconDeviceFloppy size={16} />
                              ) : (
                                <IconPencil size={16} />
                              )}
                            </ActionIcon>
                          </Tooltip>
                        )}

                        {onRecomputeReferences && (
                          <Tooltip label="sn-ify" withArrow>
                            <ActionIcon
                              size={compact ? 22 : isMobile ? "md" : "sm"}
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
                            size={compact ? 22 : isMobile ? "md" : "sm"}
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
                      value={
                        jsonDrafts[item.id] ??
                        JSON.stringify(item.statement, null, 2)
                      }
                      autosize
                      minRows={4}
                      styles={{
                        input: { fontFamily: "monospace", fontSize: 11 },
                      }}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setJsonDrafts((current) => ({
                          ...current,
                          [item.id]: value,
                        }));
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
                          <Text size={isMobile ? "xs" : "10px"} c="dimmed" ff="monospace">
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
