import type { CreatedSymbolTarget } from "@/serverFns/createDefinitionWithDeclaredSymbol.server";
import {
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { FtmlPreview } from "./FtmlPreview";

type SelectedTextRange = {
  selectedText: string;
  startOffset: number;
  endOffset: number;
};

interface CreateSymbolDefiniendumDialogProps {
  opened: boolean;
  target: CreatedSymbolTarget | null;
  onClose: () => void;
  onConfirm: (selection: SelectedTextRange) => Promise<void>;
}

export function CreateSymbolDefiniendumDialog({
  opened,
  target,
  onClose,
  onConfirm,
}: CreateSymbolDefiniendumDialogProps) {
  const [selection, setSelection] = useState<SelectedTextRange | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setSelection(null);
    setSubmitting(false);
  }, [opened, target?.definition.id]);

  const handleSelection = () => {
    const selected = window.getSelection();
    if (!selected || selected.rangeCount === 0) return;

    const range = selected.getRangeAt(0);
    const selectedText = selected.toString();
    if (!selectedText.trim()) return;

    if (
      range.startContainer !== range.endContainer ||
      range.startContainer.nodeType !== Node.TEXT_NODE
    ) {
      return;
    }

    setSelection({
      selectedText,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
    });
  };

  const handleConfirm = async () => {
    if (!selection) return;

    setSubmitting(true);
    try {
      await onConfirm(selection);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add definiendum"
      centered
      size="lg"
      radius="md"
      padding="xl"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Select the symbol text in the new definition, then confirm to declare
          it.
        </Text>

        {target && (
          <>
            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Group justify="space-between" mb={4}>
                <Text size="xs" c="dimmed">
                  New definition
                </Text>
                <Text size="xs" ff="monospace" c="dimmed">
                  {target.definition.fileName}
                </Text>
              </Group>

              <div
                style={{ userSelect: "text", cursor: "text" }}
                onMouseUp={handleSelection}
              >
                <FtmlPreview
                  docId={target.definition.id}
                  ftmlAst={target.definition.statement}
                />
              </div>
            </Paper>

            <Paper withBorder p="sm" radius="md" bg="blue.0">
              <Text size="xs" fw={600} c="dimmed" mb={4}>
                Symbol to declare:
              </Text>
              <Text size="sm" fw={500}>
                {target.symbol.symbolName}
              </Text>
            </Paper>
          </>
        )}

        {selection && (
          <Paper withBorder p="sm" radius="md" bg="green.0">
            <Text size="xs" fw={600} c="dimmed" mb={4}>
              Selected text:
            </Text>
            <Text size="sm">{selection.selectedText}</Text>
          </Paper>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Skip
          </Button>
          <Button
            leftSection={<IconCheck size={16} />}
            disabled={!selection || !target}
            loading={submitting}
            onClick={handleConfirm}
          >
            Declare definiendum
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
