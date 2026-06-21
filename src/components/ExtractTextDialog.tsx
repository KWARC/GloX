import {
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";

export function normalizeContentName(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}

interface ExtractTextDialogProps {
  opened: boolean;
  initialText: string;
  definitionName: string;
  mode?: "definition" | "symbol-target";
  symbolName?: string;
  filePath: string;
  setDefinitionName: (v: string) => void;
  setSymbolName?: Dispatch<SetStateAction<string>>;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function ExtractTextDialog({
  opened,
  initialText,
  definitionName,
  mode = "definition",
  symbolName = "",
  setDefinitionName,
  setSymbolName,
  filePath,
  onClose,
  onSubmit,
}: ExtractTextDialogProps) {
  const [text, setText] = useState(initialText);
  const isSymbolTargetMode = mode === "symbol-target";

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
              Extract Text
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
          onChange={(e) =>
            setDefinitionName(normalizeContentName(e.currentTarget.value))
          }
          styles={{ input: { fontWeight: 500 } }}
        />
        {isSymbolTargetMode && (
          <TextInput
            label="Symbol name"
            placeholder="e.g. derivative"
            value={symbolName}
            onChange={(e) => setSymbolName?.(e.currentTarget.value)}
            styles={{ input: { fontWeight: 500 } }}
          />
        )}
        <Divider />

        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Extracted Text
          </Text>
          <Text size="xs" c="dimmed">
            Review and edit the selected text before extracting.
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
              onSubmit(cleaned);
            }}
            disabled={
              !text.trim() ||
              !definitionName.trim() ||
              (isSymbolTargetMode && !symbolName.trim())
            }
            leftSection={<IconFileText size={16} />}
          >
            Extract
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
