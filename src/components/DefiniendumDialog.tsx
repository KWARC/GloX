import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  Paper,
  Portal,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

interface DefiniendumDialogProps {
  extractedText: string;
  opened: boolean;
  onSubmit: (params: {
    symbolName: string;
    alias: string;
    symdecl: boolean;
  }) => void;
  onClose: () => void;
}

export function DefiniendumDialog({
  extractedText,
  opened,
  onSubmit,
  onClose,
}: DefiniendumDialogProps) {
  const [symbolName, setSymbolName] = useState("");
  const [alias, setAlias] = useState("");
  const [symdecl, setSymdecl] = useState(false);

  function handleClose() {
    setSymbolName("");
    setAlias("");
    setSymdecl(false);
    onClose();
  }

  if (!opened) return null;

  return (
    <Portal>
      <Paper
        withBorder
        shadow="xl"
        p="lg"
        radius="md"
        style={{
          position: "fixed",
          right: 60,
          top: 100,
          width: 420,
          zIndex: 5000,
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600}>Add Definiendum</Text>
            <ActionIcon variant="subtle" onClick={handleClose}>
              ×
            </ActionIcon>
          </Group>

          <Paper withBorder p="sm" bg="gray.0">
            <Text size="xs" fw={600} c="dimmed">
              Extracted text
            </Text>
            <Text size="sm">{extractedText}</Text>
          </Paper>

          <TextInput
            label="Symbol name"
            placeholder="e.g. f, G, Hom(X,Y)"
            value={symbolName}
            onChange={(e) => setSymbolName(e.currentTarget.value)}
            required
          />

          <Textarea
            label="Alias"
            placeholder="Optional alias or description"
            value={alias}
            onChange={(e) => setAlias(e.currentTarget.value)}
            autosize
            minRows={2}
          />

          <Checkbox
            label="Symbol needs to be declared (symdecl)"
            checked={symdecl}
            onChange={(e) => setSymdecl(e.currentTarget.checked)}
          />

          <Button
            fullWidth
            onClick={() => {
              onSubmit({
                symbolName: symbolName.trim(),
                alias: alias.trim(),
                symdecl,
              });
              setSymbolName("");
              setAlias("");
              setSymdecl(true);
            }}
            disabled={!symbolName.trim()}
          >
            Save Definiendum
          </Button>
        </Stack>
      </Paper>
    </Portal>
  );
}
