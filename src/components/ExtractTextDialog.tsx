import { Button, Group, Modal, Stack, Textarea } from "@mantine/core";
import { useEffect, useState } from "react";

interface ExtractTextDialogProps {
  opened: boolean;
  initialText: string;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function ExtractTextDialog({
  opened,
  initialText,
  onClose,
  onSubmit,
}: ExtractTextDialogProps) {
  const [text, setText] = useState(initialText);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Extracted Text"
      centered
      size="lg"
    >
      <Stack gap="md">
        <Textarea
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          autosize
          minRows={6}
          styles={{
            input: {
              fontFamily: "monospace",
              lineHeight: 1.6,
            },
          }}
        />

        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const cleaned = text.trim();
              if (!cleaned) return;
              onSubmit(cleaned);
            }}
          >
            Extract
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
