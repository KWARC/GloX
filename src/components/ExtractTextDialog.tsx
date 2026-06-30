import {
  Button,
  Divider,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import { PARAGRAPH_KINDS, ParagraphKind } from "@/types/paragraphKind";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

export function normalizeContentName(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}

interface ExtractTextDialogProps {
  opened: boolean;
  initialText: string;
  definitionName: string;
  definitionNameDisabled?: boolean;
  kind: ParagraphKind;
  mode?: "definition" | "symbol-target";
  symbolName?: string;
  symbolNameDisabled?: boolean;
  filePath: string;
  setDefinitionName: (v: string) => void;
  setKind: Dispatch<SetStateAction<ParagraphKind>>;
  setSymbolName?: Dispatch<SetStateAction<string>>;
  onClose: () => void;
  onSubmit: (payload: { text: string; kind: ParagraphKind }) => void;
  title?: string;
  textLabel?: string;
  submitLabel?: string;
  hideSymbolNameField?: boolean;
}

export function ExtractTextDialog({
  opened,
  initialText,
  definitionName,
  definitionNameDisabled = false,
  kind,
  mode = "definition",
  symbolName = "",
  symbolNameDisabled = false,
  setDefinitionName,
  setKind,
  setSymbolName,
  filePath,
  onClose,
  onSubmit,
  title = "Extract Text",
  textLabel = "Extracted Text",
  submitLabel = "Extract",
  hideSymbolNameField = false,
}: ExtractTextDialogProps) {
  const [text, setText] = useState(initialText);
  const showSymbolNameField =
    mode === "symbol-target" && !hideSymbolNameField;

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  return (
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

          <Text
            size="xs"
            c="dimmed"
            ff="monospace"
            style={{ userSelect: "text", lineHeight: 1.2 }}
          >
            {filePath}
          </Text>
        </Stack>
      }
      centered
      size="lg"
      radius="md"
      padding="xl"
    >
      <Stack gap="lg">
        <TextInput
          label="Content Name"
          placeholder="e.g. derivative-rules"
          value={definitionName}
          disabled={definitionNameDisabled}
          onChange={(e) =>
            setDefinitionName(normalizeContentName(e.currentTarget.value))
          }
          styles={{ input: { fontWeight: 500 } }}
        />
        <Select
          label="Paragraph Kind"
          data={PARAGRAPH_KINDS.map((value) => ({
            value,
            label: value,
          }))}
          value={kind}
          onChange={(value) => {
            if (value) setKind(value as ParagraphKind);
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
            onChange={(e) => setText(e.currentTarget.value)}
            autosize
            minRows={6}
            styles={{
              input: {
                fontFamily: "monospace",
                fontSize: "0.85rem",
                lineHeight: 1.7,
              },
            }}
          />
        </Stack>

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const cleaned = text.trim();
              if (!cleaned) return;
              onSubmit({ text: cleaned, kind });
            }}
            disabled={
              !text.trim() ||
              !definitionName.trim() ||
              (showSymbolNameField && !symbolName.trim())
            }
            leftSection={<IconFileText size={16} />}
          >
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
