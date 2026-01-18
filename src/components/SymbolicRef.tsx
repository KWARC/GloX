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

type TabType = "MATHHUB" | "DB";

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
  const [activeTab, setActiveTab] = useState<TabType>("MATHHUB");
  const [selectedSymbol, setSelectedSymbol] =
    useState<UnifiedSymbolicReference | null>(null);

  const isSearchValid = searchQuery.trim().length >= MIN_SEARCH_LENGTH;

  const { data: mathHubResults = [], isFetching: isSearchingMathHub } =
    useQuery({
      queryKey: ["symbol-search", searchQuery],
      queryFn: () => ftmlSearchSymbols(searchQuery, MATHHUB_RESULTS_LIMIT),
      enabled: activeTab === "MATHHUB" && isSearchValid,
    });

  const { data: databaseResults = [], isFetching: isSearchingDatabase } =
    useQuery({
      queryKey: ["db-symbol-search", searchQuery],
      queryFn: () => searchDefiniendum({ data: searchQuery }),
      enabled: activeTab === "DB" && isSearchValid,
    });

  const showNoMathHubResults =
    activeTab === "MATHHUB" &&
    isSearchValid &&
    !isSearchingMathHub &&
    mathHubResults.length === 0;

  const showNoDatabaseResults =
    activeTab === "DB" &&
    isSearchValid &&
    !isSearchingDatabase &&
    databaseResults.length === 0;

  const hasResults =
    (activeTab === "MATHHUB" && mathHubResults.length > 0) ||
    (activeTab === "DB" && databaseResults.length > 0);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedSymbol(null);
  };

  const handleSymbolSelect = () => {
    if (selectedSymbol) {
      onSelect(selectedSymbol);
    }
  };

  const handleMathHubSymbolClick = (uri: string) => {
    setSelectedSymbol({
      source: "MATHHUB",
      uri,
    });
  };

  const handleDatabaseSymbolClick = (symbol: (typeof databaseResults)[0]) => {
    setSelectedSymbol({
      source: "DB",
      symbolName: symbol.symbolName,
      futureRepo: symbol.futureRepo,
      filePath: symbol.filePath,
      fileName: symbol.fileName,
      language: symbol.language,
    });
  };

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

          <Group gap={0} grow>
            <Button
              size="xs"
              variant={activeTab === "MATHHUB" ? "filled" : "light"}
              onClick={() => handleTabChange("MATHHUB")}
            >
              MathHub
            </Button>

            <Button
              size="xs"
              variant={activeTab === "DB" ? "filled" : "light"}
              onClick={() => handleTabChange("DB")}
            >
              DB
            </Button>
          </Group>

          <TextInput
            label="Search in MathHub"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            placeholder="Edit to search for another definition…"
          />

          {activeTab === "MATHHUB" && isSearchingMathHub && (
            <Text size="xs" c="dimmed">
              Searching MathHub…
            </Text>
          )}

          {activeTab === "DB" && isSearchingDatabase && (
            <Text size="xs" c="dimmed">
              Searching Database…
            </Text>
          )}

          {showNoMathHubResults && (
            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Text size="xs" c="dimmed">
                No matching symbols found in MathHub.
              </Text>
            </Paper>
          )}

          {showNoDatabaseResults && (
            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Text size="xs" c="dimmed">
                No matching symbols found in the database.
              </Text>
            </Paper>
          )}

          {hasResults && (
            <Paper withBorder p="sm" radius="md">
              <Group justify="space-between" mb="xs">
                <Text size="xs" fw={600}>
                  {activeTab === "MATHHUB"
                    ? "Found in MathHub"
                    : "Found in Database"}
                </Text>
              </Group>

              <ScrollArea h={SEARCH_RESULTS_HEIGHT}>
                <Stack gap={4}>
                  {activeTab === "MATHHUB" &&
                    mathHubResults.map((uri, index) => (
                      <Button
                        key={index}
                        variant="subtle"
                        size="xs"
                        justify="space-between"
                        onClick={() => handleMathHubSymbolClick(uri)}
                      >
                        <RenderSymbolicUri uri={uri} />
                      </Button>
                    ))}

                  {activeTab === "DB" &&
                    databaseResults.map((dbSymbol) => (
                      <Button
                        key={dbSymbol.id}
                        variant="subtle"
                        size="xs"
                        justify="space-between"
                        onClick={() => handleDatabaseSymbolClick(dbSymbol)}
                      >
                        <RenderDbSymbol
                          symbol={{
                            source: "DB",
                            symbolName: dbSymbol.symbolName,
                            futureRepo: dbSymbol.futureRepo,
                          }}
                        />
                      </Button>
                    ))}
                </Stack>
              </ScrollArea>
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
