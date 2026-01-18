import { ParsedMathHubUri, parseUri } from "@/server/parseUri";
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
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { RenderSymbolicUri } from "./RenderSymbolicUri";

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
  const [symbolSearch, setSymbolSearch] = useState(conceptUri);
  const [showMathHubResults, setShowMathHubResults] = useState(true);

  const { data: autoUris = [], isFetching } = useQuery({
    queryKey: ["symbol-search", symbolSearch],
    queryFn: () => ftmlSearchSymbols(symbolSearch, 15),
    enabled: symbolSearch.trim().length >= 2,
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

          <TextInput
            label="Search MathHub symbols"
            value={symbolSearch}
            onChange={(e) => setSymbolSearch(e.currentTarget.value)}
            placeholder="Edit to search for another definition…"
          />

          {isFetching && (
            <Text size="xs" c="dimmed">
              Searching MathHub…
            </Text>
          )}

          {isFetching && (
            <Text size="xs" c="dimmed">
              Searching MathHub for existing symbols…
            </Text>
          )}

          {autoUris.length > 0 && (
            <Paper withBorder p="sm" radius="md">
              <Group justify="space-between" mb="xs">
                <Text size="xs" fw={600}>
                  Found in MathHub
                </Text>

                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={() => setShowMathHubResults((v) => !v)}
                >
                  {showMathHubResults ? "−" : "+"}
                </ActionIcon>
              </Group>

              {showMathHubResults && (
                <ScrollArea h={180}>
                  <Stack gap={4}>
                    {autoUris.map((uri) => (
                      <Button
                        key={uri}
                        variant="subtle"
                        size="xs"
                        justify="space-between"
                        onClick={() => onUriChange(uri)}
                      >
                        <RenderSymbolicUri uri={uri} />
                      </Button>
                    ))}
                  </Stack>
                </ScrollArea>
              )}
            </Paper>
          )}

          {/* <Text size="sm" c="dimmed" lh={1.6}>
            Search for matching URIs below:
          </Text>
          <UriAutoComplete
            value={selectedUri}
            onChange={onUriChange}
            label="Matching URIs"
            placeholder="Click here to see matching URIs..."
          /> */}
          {selectedUri && (
            <Paper withBorder p="sm" bg="green.0" radius="md">
              <Text size="xs" fw={600} c="dimmed" mb={4}>
                Selected URI:
              </Text>
              <Tooltip
                label={selectedUri}
                withArrow
                multiline
                maw={400}
                position="top"
                zIndex={5000}
              >
                <span style={{ cursor: "help", display: "inline-block" }}>
                  <Text size="xs" ff="monospace">
                    <RenderSymbolicUri uri={selectedUri} />
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
