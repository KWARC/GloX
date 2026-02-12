import { parseUri } from "@/server/parseUri";
import { SymbolSearchResult, useSymbolSearch } from "@/server/useSymbolSearch";
import {
  Badge,
  Button,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconArchive, IconSchool } from "@tabler/icons-react";

const SEARCH_RESULTS_HEIGHT = 240;
const MATHHUB_SECTION_HEIGHT = Math.floor(SEARCH_RESULTS_HEIGHT * 0.7);
const DB_SECTION_HEIGHT = Math.floor(SEARCH_RESULTS_HEIGHT * 0.3);

interface SymbolResultProps {
  initialQuery: string;
  onQueryChange: (query: string) => void;
  selectedSymbol: SymbolSearchResult | null;
  onSelectSymbol: (symbol: SymbolSearchResult) => void;
  enabled?: boolean;
}

export function SymbolResult({
  initialQuery,
  onQueryChange,
  selectedSymbol,
  onSelectSymbol,
  enabled = true,
}: SymbolResultProps) {
  const { results, isReady, hasResults } = useSymbolSearch(
    initialQuery,
    enabled,
  );

  const dbResults = results.filter((r) => r.source === "DB");
  const mathHubResults = results.filter((r) => r.source === "MATHHUB");

  const showNoResults =
    initialQuery.trim().length >= 2 && isReady && !hasResults;

  return (
    <Stack gap="sm">
      <TextInput
        label="Search"
        value={initialQuery}
        onChange={(e) => onQueryChange(e.currentTarget.value)}
        placeholder="Search for symbols..."
      />

      {showNoResults && (
        <Paper withBorder p="sm" radius="md" bg="gray.0">
          <Text size="xs" c="dimmed">
            No matching symbols found.
          </Text>
        </Paper>
      )}

      {isReady && hasResults && (
        <Paper withBorder p="sm" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={600}>
              Found Symbols
            </Text>
          </Group>

          <Stack gap={4} mt="sm">
            <Group justify="space-between">
              <Text size="xs" fw={500} c="dimmed">
                Local / Database
              </Text>

              {dbResults.length > 0 && (
                <Text size="xs" c="dimmed">
                  {dbResults.length} local
                </Text>
              )}
            </Group>

            <ScrollArea
              h={DB_SECTION_HEIGHT}
              type="always"
              scrollbarSize={6}
              onWheelCapture={(e) => e.stopPropagation()}
            >
              <Stack gap={4}>
                {dbResults.map((result) => {
                  if (result.source !== "DB") return null;

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
                })}

                {dbResults.length === 0 && (
                  <Text size="xs" c="dimmed" ta="center">
                    No local symbols
                  </Text>
                )}
              </Stack>
            </ScrollArea>
          </Stack>

          <Stack gap={4}>
            <Text size="xs" fw={500} c="dimmed">
              MathHub
            </Text>

            <ScrollArea
              h={MATHHUB_SECTION_HEIGHT}
              type="always"
              scrollbarSize={6}
              onWheelCapture={(e) => e.stopPropagation()}
            >
              <Stack gap={4}>
                {mathHubResults.map((result) => {
                  if (result.source !== "MATHHUB") return null;

                  const parsed = parseUri(result.uri);

                  return (
                    <Button
                      key={`mh:${result.uri}`}
                      variant={
                        selectedSymbol?.source === "MATHHUB" &&
                        selectedSymbol.uri === result.uri
                          ? "filled"
                          : "subtle"
                      }
                      size="xs"
                      justify="space-between"
                      onClick={() => onSelectSymbol(result)}
                    >
                      <Group justify="space-between" wrap="nowrap" w="100%">
                        <Group gap={4} wrap="nowrap">
                          <IconArchive size={14} stroke={1.6} />
                          <Text size="xs" c="dimmed">
                            {parsed.archive}
                          </Text>
                        </Group>

                        {parsed.symbol && (
                          <Group gap={4} wrap="nowrap">
                            <IconSchool size={14} stroke={1.8} />
                            <Text size="xs" fw={500}>
                              {parsed.symbol}
                            </Text>
                          </Group>
                        )}
                      </Group>
                    </Button>
                  );
                })}

                {mathHubResults.length === 0 && (
                  <Text size="xs" c="dimmed" ta="center">
                    No MathHub results
                  </Text>
                )}
              </Stack>
            </ScrollArea>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
