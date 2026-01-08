import { UriAutoComplete } from "@/components/UriAutoComplete";
import { ParsedMathHubUri, parseUri } from "@/server/parseUri";
import {
  ActionIcon,
  Button,
  Group,
  Paper,
  Portal,
  Stack,
  Text,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";

interface SymbolicRefProps {
  conceptUri: string;
  selectedUri: string;
  onUriChange: (value: string) => void;
  onSelect: (parsed: ParsedMathHubUri) => void;
  onClose: () => void;
}

export function SymbolicRef({
  conceptUri,
  selectedUri,
  onUriChange,
  onSelect,
  onClose,
}: SymbolicRefProps) {
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
          top: 80,
          width: 440,
          maxHeight: "calc(100vh - 120px)",
          overflowY: "auto",
          zIndex: 4000,
          border: "2px solid var(--mantine-color-blue-4)",
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <Text fw={600}>Symbolic Reference</Text>
            </Group>
            <ActionIcon variant="subtle" color="gray" onClick={onClose}>
              <IconX size={16} />
            </ActionIcon>
          </Group>
          <Paper withBorder p="sm" bg="blue.0" radius="md">
            <Text size="xs" fw={600} c="dimmed" mb={4}>
              Selected Text:
            </Text>
            <Text size="sm" fw={500}>
              {conceptUri}
            </Text>
          </Paper>
          <Text size="sm" c="dimmed" lh={1.6}>
            Search for matching URIs below:
          </Text>
          <UriAutoComplete
            selectedText={conceptUri}
            value={selectedUri}
            onChange={onUriChange}
            label="Matching URIs"
            placeholder="Click here to see matching URIs..."
          />
          {selectedUri && (
            <Paper withBorder p="sm" bg="green.0" radius="md">
              <Text size="xs" fw={600} c="dimmed" mb={4}>
                Selected URI:
              </Text>
              <Text size="xs" style={{ wordBreak: "break-all" }}>
                {selectedUri}
              </Text>
            </Paper>
          )}
          <Button
            onClick={() => {
              if (!selectedUri) return;
              const parsed = parseUri(selectedUri);
              console.log("[SymbolicRef] parsed URI =", parsed);
              onSelect(parsed); // ← THIS is the trigger
            }}
            disabled={!selectedUri}
            fullWidth
          >
            Select URI
          </Button>
        </Stack>
      </Paper>
    </Portal>
  );
}
