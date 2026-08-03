import {
  Button,
  ActionIcon,
  Checkbox,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconFileText, IconPencil } from "@tabler/icons-react";
import { EXTRACT_BLOCK_TYPES, ExtractBlockType, blockTypeLabel } from "@/types/blockType";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { FtmlPreview } from "./FtmlPreview";
import { DefiniendumDialog } from "./DefiniendumDialog";
import { SymbolicRef } from "./SymbolicRef";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { useDraftSemanticAuthoring } from "@/hooks/useDraftSemanticAuthoring";
import { SymbolSearchResult } from "@/server/useSymbolSearch";
import { FloDownStatement } from "@/types/floDown.types";
import { SelectionPopup } from "./SelectionPopup";

export function normalizeContentName(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}

function getFilePathSegments(filePath: string): string[] {
  const parts = filePath
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const grouped: string[] = [];
  for (let index = 0; index < parts.length; index += 2) {
    const current = parts[index];
    const next = parts[index + 1];
    grouped.push(next ? `${current}/${next}` : current);
  }

  return grouped;
}

interface ExtractTextDialogProps {
  opened: boolean;
  initialText: string;
  paragraphFileName: string;
  paragraphFileNameDisabled?: boolean;
  blockType: ExtractBlockType;
  mode?: "definition" | "symbol-target";
  symbolName?: string;
  symbolNameDisabled?: boolean;
  filePath: string;
  location?: {
    futureRepo: string;
    filePath: string;
    language: string;
    setFutureRepo: (value: string) => void;
    setFilePath: (value: string) => void;
    setLanguage: (value: string) => void;
  };
  setParagraphFileName: (v: string) => void;
  setBlockType: Dispatch<SetStateAction<ExtractBlockType>>;
  setSymbolName?: Dispatch<SetStateAction<string>>;
  onClose: () => void;
  onSubmit: (payload: {
    text: string;
    blockType: ExtractBlockType;
    statement?: FloDownStatement;
    declaredSymbols?: string[];
  }) => void;
  title?: string;
  textLabel?: string;
  textPlaceholder?: string;
  submitLabel?: string;
  hideSymbolNameField?: boolean;
  enableSemanticAuthoring?: boolean;
  semanticEnabled?: boolean;
  setSemanticEnabled?: Dispatch<SetStateAction<boolean>>;
}

export function ExtractTextDialog({
  opened,
  initialText,
  paragraphFileName,
  paragraphFileNameDisabled = false,
  blockType,
  mode = "definition",
  symbolName = "",
  symbolNameDisabled = false,
  setParagraphFileName,
  setBlockType,
  setSymbolName,
  filePath,
  location,
  onClose,
  onSubmit,
  title = "Extract Text",
  textLabel = "Extracted Text",
  textPlaceholder,
  submitLabel = "Extract",
  hideSymbolNameField = false,
  enableSemanticAuthoring = false,
  semanticEnabled = false,
  setSemanticEnabled,
}: ExtractTextDialogProps) {
  const [text, setText] = useState(initialText);
  const [semanticError, setSemanticError] = useState<string | null>(null);
  const [definiendumDialogOpen, setDefiniendumDialogOpen] = useState(false);
  const [symbolicRefDialogOpen, setSymbolicRefDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const showSymbolNameField =
    mode === "symbol-target" && !hideSymbolNameField;
  const filePathSegments = getFilePathSegments(filePath);
  const draftSemantic = useDraftSemanticAuthoring(
    text,
    enableSemanticAuthoring && semanticEnabled,
    previewRef,
  );

  useEffect(() => {
    setText(initialText);
    setSemanticError(null);
  }, [initialText]);

  useEffect(() => {
    if (!opened) {
      setSemanticError(null);
      setDefiniendumDialogOpen(false);
      setSymbolicRefDialogOpen(false);
    }
  }, [opened]);

  function handleTextChange(nextText: string) {
    setText(nextText);
    setSemanticError(null);
  }

  function handleSemanticToggle(nextValue: boolean) {
    if (!nextValue && draftSemantic.hasSemantics) {
      const shouldDiscard = window.confirm(
        "Added definiendum/symbolic ref will not be added. Continue?",
      );

      if (!shouldDiscard) return;
    }

    setSemanticEnabled?.(nextValue);
    setSemanticError(null);
  }

  async function handleDefiniendumSubmit(
    params:
      | {
          mode: "CREATE";
          symbolName: string;
          symdecl: true;
        }
      | {
          mode: "PICK_EXISTING";
          selectedSymbol: SymbolSearchResult;
        },
  ) {
    try {
      if (params.mode === "CREATE") {
        draftSemantic.applyDefiniendum({
          mode: "CREATE",
          symbolName: params.symbolName,
        });
      } else if (params.selectedSymbol.source === "DB") {
        draftSemantic.applyDefiniendum({
          mode: "PICK_EXISTING",
          symbol: {
            source: "DB",
            symbolName: params.selectedSymbol.symbolName,
          },
        });
      } else {
        draftSemantic.applyDefiniendum({
          mode: "PICK_EXISTING",
          symbol: {
            source: "MATHHUB",
            uri: params.selectedSymbol.uri,
          },
        });
      }

      setSemanticError(null);
      setDefiniendumDialogOpen(false);
    } catch (error) {
      setSemanticError(
        error instanceof Error ? error.message : "Could not add definiendum",
      );
    }
  }

  async function handleSymrefSelect(symRef: UnifiedSymbolicReference) {
    try {
      draftSemantic.applySymref(symRef);
      setSemanticError(null);
      setSymbolicRefDialogOpen(false);
    } catch (error) {
      setSemanticError(
        error instanceof Error
          ? error.message
          : "Could not add symbolic reference",
      );
    }
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Stack gap={0}>
            <Group gap="xs">
              <IconFileText size={18} color="var(--mantine-color-blue-6)" />
              <Text fw={600} size="md">
                {title}
              </Text>
            </Group>

            <Group gap={6} wrap="wrap">
              {filePathSegments.map((segment) => (
                <Text key={segment} size="xs" c="dimmed" ff="monospace" style={{ userSelect: "text", lineHeight: 1.2 }}>
                  [{segment}]
                </Text>
              ))}
              {location && <ActionIcon size="xs" variant="subtle" onClick={() => setEditingLocation((value) => !value)} aria-label="Edit content location">
                <IconPencil size={13} />
              </ActionIcon>}
            </Group>
          </Stack>
        }
        centered
        size="lg"
        radius="md"
        padding="xl"
      >
        <Stack gap="lg">
          {location && editingLocation && (
            <Paper withBorder p="sm" bg="gray.0">
              <Stack gap="xs">
                <Text size="xs" fw={600}>Content location</Text>
                <TextInput size="xs" label="Future Repo" value={location.futureRepo} onChange={(event) => location.setFutureRepo(event.currentTarget.value)} />
                <TextInput size="xs" label="File Path" value={location.filePath} onChange={(event) => location.setFilePath(event.currentTarget.value)} />
                <TextInput size="xs" label="Language" value={location.language} onChange={(event) => location.setLanguage(event.currentTarget.value)} />
              </Stack>
            </Paper>
          )}
          <TextInput
            label="Content Name"
            placeholder="e.g. derivative-rules"
            value={paragraphFileName}
            disabled={paragraphFileNameDisabled}
            onChange={(e) =>
              setParagraphFileName(normalizeContentName(e.currentTarget.value))
            }
            styles={{ input: { fontWeight: 500 } }}
          />
          <Select
            label="Block type"
            data={EXTRACT_BLOCK_TYPES.map((value) => ({
              value,
              label: blockTypeLabel(value),
            }))}
            value={blockType}
            onChange={(value) => {
              if (value) setBlockType(value as ExtractBlockType);
            }}
            allowDeselect={false}
          />
          {showSymbolNameField && (
            <TextInput
              label="Symbol name"
              placeholder="e.g. derivative"
              value={symbolName}
              disabled={symbolNameDisabled}
              onChange={(e) => setSymbolName?.(e.currentTarget.value)}
              styles={{ input: { fontWeight: 500 } }}
            />
          )}

          <Divider />

          <Stack gap={4}>
            <Text size="sm" fw={500}>
              {textLabel}
            </Text>
            <Textarea
              value={text}
              onChange={(e) => handleTextChange(e.currentTarget.value)}
              placeholder={textPlaceholder}
              disabled={enableSemanticAuthoring && semanticEnabled}
              autosize
              minRows={2}
              maxRows={12}
              styles={{
                input: {
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  lineHeight: 1.7,
                  resize: "vertical",
                },
              }}
            />
          </Stack>

          {enableSemanticAuthoring && (
            <Checkbox
              label="Add semantics"
              checked={semanticEnabled}
              onChange={(event) =>
                handleSemanticToggle(event.currentTarget.checked)
              }
            />
          )}

          {enableSemanticAuthoring && semanticEnabled && (
            <Stack gap="sm">
              <Paper withBorder p="sm" radius="md">
                <style>
                  {`
                    [data-compact-ftml-preview] > *:first-child {
                      margin-top: 0 !important;
                    }

                    [data-compact-ftml-preview] > *:last-child {
                      margin-bottom: 0 !important;
                    }

                    [data-compact-ftml-preview] p,
                    [data-compact-ftml-preview] .paragraph {
                      margin-top: 0.2rem !important;
                      margin-bottom: 0.2rem !important;
                    }
                  `}
                </style>
                <Text size="xs" c="dimmed" fw={600} mb={6}>
                  FTML Preview
                </Text>
                <Text size="xs" c="dimmed" mb="sm">
                  Select text in the preview, then add a definiendum or symbolic
                  reference.
                </Text>
                <div
                  ref={previewRef}
                  style={{
                    maxHeight: 220,
                    overflow: "auto",
                    userSelect: "text",
                    cursor: "text",
                  }}
                  data-compact-ftml-preview
                  onMouseUp={draftSemantic.handlePreviewMouseUp}
                >
                  <FtmlPreview
                    ftmlAst={draftSemantic.statement}
                    docId="draft-definition"
                    declaredSymbols={draftSemantic.declaredSymbols}
                  />
                </div>
              </Paper>

              {semanticError && (
                <Text size="xs" c="red">
                  {semanticError}
                </Text>
              )}
            </Stack>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const cleaned = text.trim();
                if (!cleaned) return;
                onSubmit({
                  text: cleaned,
                  blockType,
                  statement:
                    enableSemanticAuthoring && semanticEnabled
                      ? draftSemantic.statement
                      : undefined,
                  declaredSymbols:
                    enableSemanticAuthoring && semanticEnabled
                      ? draftSemantic.declaredSymbols
                      : undefined,
                });
              }}
              disabled={
                !text.trim() ||
                !paragraphFileName.trim() ||
                (showSymbolNameField && !symbolName.trim())
              }
              leftSection={<IconFileText size={16} />}
            >
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <DefiniendumDialog
        opened={definiendumDialogOpen}
        extractedText={draftSemantic.selection?.selectedText ?? ""}
        onClose={() => setDefiniendumDialogOpen(false)}
        onSubmit={handleDefiniendumSubmit}
      />

      {draftSemantic.popup && (
        <SelectionPopup
          popup={draftSemantic.popup}
          onClose={draftSemantic.clearSelection}
          onDefiniendum={() => {
            draftSemantic.clearPopup();
            setDefiniendumDialogOpen(true);
          }}
          onSymbolicRef={() => {
            draftSemantic.clearPopup();
            setSymbolicRefDialogOpen(true);
          }}
        />
      )}

      {symbolicRefDialogOpen && (
        <SymbolicRef
          conceptUri={draftSemantic.selection?.selectedText ?? ""}
          onSelect={handleSymrefSelect}
          onClose={() => setSymbolicRefDialogOpen(false)}
          loading={false}
        />
      )}
    </>
  );
}
