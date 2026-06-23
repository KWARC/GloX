import { SymbolSearchResult, useSymbolSearch } from "@/server/useSymbolSearch";
import {
  ActionIcon,
  Badge,
  Button,
  Box,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { RenderSymbolicUri } from "./RenderUri";
import { SymbolicLinkPreview } from "./SymbolicLinkPreview";

const SEARCH_RESULTS_HEIGHT = 240;
const SYMBOL_RESULT_TOOLTIP_Z_INDEX = 7000;

interface SymbolResultProps {
  initialQuery: string;
  onQueryChange: (query: string) => void;
  selectedSymbol: SymbolSearchResult | null;
  onSelectSymbol: (symbol: SymbolSearchResult) => void;
  onCreateSymbol?: () => void;
  enabled?: boolean;
}

export function SymbolResult({
  initialQuery,
  onQueryChange,
  selectedSymbol,
  onSelectSymbol,
  onCreateSymbol,
  enabled = true,
}: SymbolResultProps) {
  const { results, isLoading, isReady, hasResults } = useSymbolSearch(
    initialQuery,
    enabled,
  );

  return (
    <Stack gap="sm">
      <Stack gap={4}>
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500}>
            Search
          </Text>
          <Group gap="xs">
            {isLoading && <Loader size="xs" />}
            {onCreateSymbol && (
              <Tooltip
                label="Create new symbol"
                withArrow
                position="top"
                zIndex={SYMBOL_RESULT_TOOLTIP_Z_INDEX}
              >
                <ActionIcon
                  variant="subtle"
                  color="teal"
                  onClick={onCreateSymbol}
                  aria-label="Create new symbol"
                  size="sm"
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        <TextInput
          aria-label="Search"
          value={initialQuery}
          onChange={(e) => onQueryChange(e.currentTarget.value)}
          placeholder="Search for symbols..."
        />
      </Stack>

      {isLoading && (
        <Paper withBorder p="sm" radius="md">
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        </Paper>
      )}

      {isReady && hasResults && (
        <Paper withBorder p="sm" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={600}>
              Found Symbols
            </Text>
          </Group>

          <ScrollArea
            h={SEARCH_RESULTS_HEIGHT}
            type="always"
            scrollbarSize={6}
            onWheelCapture={(e) => e.stopPropagation()}
          >
            <Stack gap={4} mt="sm">
              {results.map((result) => {
                if (result.source === "DB") {
                  return (
                    <Button
                      key={`db:${result.id}`}
                      variant={
                        selectedSymbol?.source === "DB" &&
                        selectedSymbol.id === result.id
                          ? "filled"
                          : "subtle"
                      }
                      size="xs"
                      justify="space-between"
                      onClick={() => onSelectSymbol(result)}
                    >
                      <Group justify="space-between" w="100%">
                        <Text size="xs" fw={500}>
                          {result.symbolName}
                        </Text>

                        <Group gap={4}>
                          <Badge size="xs" color="green">
                            DB
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {result.futureRepo}
                          </Text>
                        </Group>
                      </Group>
                    </Button>
                  );
                }

                const selected =
                  selectedSymbol?.source === "MATHHUB" &&
                  selectedSymbol.uri === result.uri;

                return (
                  <UnstyledButton
                    key={`mh:${result.uri}`}
                    onClick={() => onSelectSymbol(result)}
                    style={{
                      display: "block",
                      width: "100%",
                    }}
                  >
                    <Paper
                      withBorder
                      px="xs"
                      py={4}
                      radius="sm"
                      bg={selected ? "blue.0" : undefined}
                      style={{
                        borderColor: selected
                          ? "var(--mantine-color-blue-6)"
                          : undefined,
                      }}
                    >
                      <Group justify="space-between" wrap="nowrap" gap="xs">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <RenderSymbolicUri
                            uri={result.uri}
                            showRightLabel={false}
                          />
                        </Box>
                        <Box style={{ flexShrink: 0, minWidth: 0 }}>
                          <SymbolicLinkPreview uri={result.uri} />
                        </Box>
                      </Group>
                    </Paper>
                  </UnstyledButton>
                );
              })}
            </Stack>
          </ScrollArea>
        </Paper>
      )}

      {isReady && !hasResults && initialQuery.trim().length >= 2 && (
        <Paper withBorder p="sm" radius="md">
          <Group justify="center" py="md">
            <Text size="sm" c="dimmed">
              No results found
            </Text>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
