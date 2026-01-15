import { UriAutoComplete } from "@/components/UriAutoComplete";
import {
  formatSymbolicUriDisplay,
  ParsedMathHubUri,
  parseUri,
} from "@/server/parseUri";
import { ftmlSearchSymbols } from "@/spec/searchSymbols";

import {
  ActionIcon,
  Button,
  Group,
  Paper,
  Portal,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

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
  const { data: autoUris = [], isFetching } = useQuery({
    queryKey: ["symbol-search", conceptUri],
    queryFn: () => ftmlSearchSymbols(conceptUri, 15),
    enabled: !!conceptUri,
  });

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
          {isFetching && (
            <Text size="xs" c="dimmed">
              Searching MathHub for existing symbols…
            </Text>
          )}

          {autoUris.length > 0 && (
            <Paper withBorder p="sm" radius="md">
              <Text size="xs" fw={600} mb="xs">
                Found in MathHub
              </Text>

              <ScrollArea h={180} type="auto">
                <Stack gap={4}>
                  {autoUris.map((uri) => (
                    <Button
                      key={uri}
                      variant="subtle"
                      size="xs"
                      onClick={() => onUriChange(uri)}
                    >
                      {formatSymbolicUriDisplay(uri)}
                    </Button>
                  ))}
                </Stack>
              </ScrollArea>
            </Paper>
          )}

          <Text size="sm" c="dimmed" lh={1.6}>
            Search for matching URIs below:
          </Text>
          <UriAutoComplete
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
              <Tooltip
                label={selectedUri}
                withArrow
                multiline
                maw={360}
                position="top"
                zIndex={5000}
              >
                <span style={{ cursor: "help", display: "inline-block" }}>
                  <Text size="xs" ff="monospace">
                    {formatSymbolicUriDisplay(selectedUri)}
                  </Text>
                </span>
              </Tooltip>
            </Paper>
          )}
          <Button
            onClick={() => {
              if (!selectedUri) return;
              const parsed = parseUri(selectedUri);
              console.log("[SymbolicRef] parsed URI =", parsed);
              onSelect(parsed);
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
