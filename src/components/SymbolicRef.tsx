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
  const [symbolSearch, setSymbolSearch] = useState(conceptUri);
  const [activeTab, setActiveTab] = useState<"MATHHUB" | "DB">("MATHHUB");

  const [selectedSymRef, setSelectedSymRef] =
    useState<UnifiedSymbolicReference | null>(null);

  const { data: autoUris = [], isFetching: isFetchingMathHub } = useQuery({
    queryKey: ["symbol-search", symbolSearch],
    queryFn: () => ftmlSearchSymbols(symbolSearch, 15),
    enabled: activeTab === "MATHHUB" && symbolSearch.trim().length >= 2,
  });

  const { data: dbSymbols = [], isFetching: isFetchingDb } = useQuery({
    queryKey: ["db-symbol-search", symbolSearch],
    queryFn: () =>
      searchDefiniendum({
        data: symbolSearch,
      }),
    enabled: activeTab === "DB" && symbolSearch.trim().length >= 2,
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
          <Group gap={0} grow>
            <Button
              size="xs"
              variant={activeTab === "MATHHUB" ? "filled" : "light"}
              onClick={() => {
                setActiveTab("MATHHUB");
                setSelectedSymRef(null);
              }}
            >
              MathHub
            </Button>

            <Button
              size="xs"
              variant={activeTab === "DB" ? "filled" : "light"}
              onClick={() => {
                setActiveTab("DB");
                setSelectedSymRef(null);
              }}
            >
              DB
            </Button>
          </Group>

          <TextInput
            label="Search in MathHub"
            value={symbolSearch}
            onChange={(e) => setSymbolSearch(e.currentTarget.value)}
            placeholder="Edit to search for another definition…"
          />

          {activeTab === "MATHHUB" && isFetchingMathHub && (
            <Text size="xs" c="dimmed">
              Searching MathHub…
            </Text>
          )}

          {activeTab === "DB" && isFetchingDb && (
            <Text size="xs" c="dimmed">
              Searching Database…
            </Text>
          )}

          {((activeTab === "MATHHUB" && autoUris.length > 0) ||
            (activeTab === "DB" && dbSymbols.length > 0)) && (
            <Paper withBorder p="sm" radius="md">
              <Group justify="space-between" mb="xs">
                <Text size="xs" fw={600}>
                  {activeTab === "MATHHUB"
                    ? "Found in MathHub"
                    : "Found in Database"}
                </Text>
              </Group>

              <ScrollArea h={240}>
                <Stack gap={4}>
                  {activeTab === "MATHHUB" &&
                    autoUris.map((uri, i) => (
                      <Button
                        key={i}
                        variant="subtle"
                        size="xs"
                        justify="space-between"
                        onClick={() =>
                          setSelectedSymRef({
                            source: "MATHHUB",
                            uri,
                          })
                        }
                      >
                        <RenderSymbolicUri uri={uri} />
                      </Button>
                    ))}

                  {activeTab === "DB" &&
                    dbSymbols.map((d) => (
                      <Button
                        key={d.id}
                        variant="subtle"
                        size="xs"
                        justify="space-between"
                        onClick={() =>
                          setSelectedSymRef({
                            source: "DB",
                            symbolName: d.symbolName,
                            futureRepo: d.futureRepo,
                            filePath: d.filePath,
                            fileName: d.fileName,
                            language: d.language,
                          })
                        }
                      >
                        <RenderDbSymbol
                          symbol={{
                            source: "DB",
                            symbolName: d.symbolName,
                            futureRepo: d.futureRepo,
                            filePath: d.filePath,
                            fileName: d.fileName,
                            language: d.language,
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
          {selectedSymRef?.source === "MATHHUB" && (
            <Paper withBorder p="sm" bg="green.0" radius="md">
              <Text size="xs" fw={600} c="dimmed" mb={4}>
                Selected Symbol:
              </Text>
              <Tooltip
                label={selectedSymRef.uri}
                withArrow
                multiline
                maw={400}
                position="top"
                zIndex={5000}
              >
                <span style={{ cursor: "help", display: "inline-block" }}>
                  <Text size="xs" ff="monospace">
                    <RenderSymbolicUri uri={selectedSymRef.uri} />
                  </Text>
                </span>
              </Tooltip>
            </Paper>
          )}

          {selectedSymRef?.source === "DB" && (
            <Paper withBorder p="sm" bg="green.0" radius="md">
              <Text size="xs" fw={600} c="dimmed" mb={4}>
                Selected Symbol (Database):
              </Text>

              <RenderDbSymbol
                symbol={{
                  source: "DB",
                  symbolName: selectedSymRef.symbolName,
                  futureRepo: selectedSymRef.futureRepo,
                  filePath: selectedSymRef.filePath,
                  fileName: selectedSymRef.fileName,
                  language: selectedSymRef.language,
                }}
              />
            </Paper>
          )}

          <Button
            onClick={() => {
              if (!selectedSymRef) return;
              onSelect(selectedSymRef);
            }}
            disabled={!selectedSymRef}
            fullWidth
          >
            Select Symbol
          </Button>
        </Stack>
      </Paper>
    </Portal>
  );
}
