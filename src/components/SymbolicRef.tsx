import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { searchDefiniendum } from "@/serverFns/definiendum.server";
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
import { IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RenderDbSymbol, RenderSymbolicUri } from "./RenderSymbolicUri";

const SEARCH_MODAL_WIDTH = 440;
const SEARCH_MODAL_RIGHT_OFFSET = 60;
const SEARCH_MODAL_TOP_OFFSET = 80;
const SEARCH_RESULTS_HEIGHT = 240;
const MIN_SEARCH_LENGTH = 2;
const MATHHUB_RESULTS_LIMIT = 15;
const MATHHUB_SECTION_HEIGHT = Math.floor(SEARCH_RESULTS_HEIGHT * 0.7);
const DB_SECTION_HEIGHT = Math.floor(SEARCH_RESULTS_HEIGHT * 0.3);

interface SymbolicRefProps {
  conceptUri: string;
  onSelect: (symRef: UnifiedSymbolicReference) => void;
  onClose: () => void;
}

export function SymbolicRef({
  conceptUri,
  onSelect,
  onClose,
}: SymbolicRefProps) {
  const [searchQuery, setSearchQuery] = useState(conceptUri);
  const [selectedSymbol, setSelectedSymbol] =
    useState<UnifiedSymbolicReference | null>(null);

  const isSearchValid = searchQuery.trim().length >= MIN_SEARCH_LENGTH;

  const { data: mathHubResults = [], isFetching: isSearchingMathHub } =
    useQuery({
      queryKey: ["symbol-search", searchQuery],
      queryFn: () => ftmlSearchSymbols(searchQuery, MATHHUB_RESULTS_LIMIT),
      enabled: isSearchValid,
    });

  const { data: databaseResults = [], isFetching: isSearchingDatabase } =
    useQuery({
      queryKey: ["db-symbol-search", searchQuery],
      queryFn: () => searchDefiniendum({ data: searchQuery }),
      enabled: isSearchValid,
    });

  const handleSymbolSelect = () => {
    if (selectedSymbol) {
      onSelect(selectedSymbol);
    }
  };

  const isReady = !isSearchingMathHub && !isSearchingDatabase;

  const hasResults = mathHubResults.length > 0 || databaseResults.length > 0;

  const showNoResults =
    isSearchValid &&
    isReady &&
    mathHubResults.length === 0 &&
    databaseResults.length === 0;

  return (
    <Portal>
      <Paper
        withBorder
        shadow="xl"
        p="lg"
        radius="md"
        style={{
          position: "fixed",
          right: SEARCH_MODAL_RIGHT_OFFSET,
          top: SEARCH_MODAL_TOP_OFFSET,
          width: SEARCH_MODAL_WIDTH,
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
            label="Search in MathHub"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            placeholder="Edit to search for another definition…"
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

              <Stack gap={4}>
                <Text size="xs" fw={500} c="dimmed">
                  MathHub
                </Text>

                <ScrollArea h={MATHHUB_SECTION_HEIGHT}>
                  <Stack gap={4}>
                    {mathHubResults.map((uri) => (
                      <Button
                        key={`mh:${uri}`}
                        variant="subtle"
                        size="xs"
                        justify="space-between"
                        onClick={() =>
                          setSelectedSymbol({
                            source: "MATHHUB",
                            uri,
                          })
                        }
                      >
                        <RenderSymbolicUri uri={uri} />
                      </Button>
                    ))}

                    {!mathHubResults.length && (
                      <Text size="xs" c="dimmed" ta="center">
                        No MathHub results
                      </Text>
                    )}
                  </Stack>
                </ScrollArea>
              </Stack>

              <Stack gap={4} mt="sm">
                <Group justify="space-between">
                  <Text size="xs" fw={500} c="dimmed">
                    Local / Temporary
                  </Text>

                  {databaseResults.length > 0 && (
                    <Text size="xs" c="dimmed">
                      {databaseResults.length} local
                    </Text>
                  )}
                </Group>

                <ScrollArea h={DB_SECTION_HEIGHT}>
                  <Stack gap={4}>
                    {databaseResults.map((db) => (
                      <Button
                        key={`db:${db.id}`}
                        variant="subtle"
                        size="xs"
                        justify="space-between"
                        onClick={() =>
                          setSelectedSymbol({
                            source: "DB",
                            symbolName: db.symbolName,
                            futureRepo: db.futureRepo,
                            filePath: db.filePath,
                            fileName: db.fileName,
                            language: db.language,
                          })
                        }
                      >
                        <RenderDbSymbol
                          symbol={{
                            source: "DB",
                            symbolName: db.symbolName,
                            futureRepo: db.futureRepo,
                          }}
                        />
                      </Button>
                    ))}

                    {!databaseResults.length && (
                      <Text size="xs" c="dimmed" ta="center">
                        No local symbols
                      </Text>
                    )}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Paper>
          )}

          {selectedSymbol?.source === "MATHHUB" && (
            <Paper withBorder p="sm" bg="green.0" radius="md">
              <Text size="xs" fw={600} c="dimmed" mb={4}>
                Selected Symbol:
              </Text>
              <Tooltip
                label={selectedSymbol.uri}
                withArrow
                multiline
                maw={400}
                position="top"
                zIndex={5000}
              >
                <span style={{ cursor: "help", display: "inline-block" }}>
                  <Text size="xs" ff="monospace">
                    <RenderSymbolicUri uri={selectedSymbol.uri} />
                  </Text>
                </span>
              </Tooltip>
            </Paper>
          )}

          {selectedSymbol?.source === "DB" && (
            <Paper withBorder p="sm" bg="green.0" radius="md">
              <Text size="xs" fw={600} c="dimmed" mb={4}>
                Selected Symbol (Database):
              </Text>

              <RenderDbSymbol
                symbol={{
                  source: "DB",
                  symbolName: selectedSymbol.symbolName,
                  futureRepo: selectedSymbol.futureRepo,
                }}
              />
            </Paper>
          )}

          <Button
            onClick={handleSymbolSelect}
            disabled={!selectedSymbol}
            fullWidth
          >
            Select Symbol
          </Button>
        </Stack>
      </Paper>
    </Portal>
  );
}
