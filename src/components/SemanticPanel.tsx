import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
import { useSymbolSearch } from "@/server/useSymbolSearch";
import {
  DbSymbolResult,
  MathhubResult,
  OnDeleteNode,
  OnReplaceNode,
  SelectedNode,
  SemanticDefinition,
} from "@/types/Semantic.types";
import {
  Box,
  Button,
  Center,
  Flex,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { CurrentUriDisplay } from "./CurrentUriDisplay";
import { DbResultItem } from "./DbResultItem";
import { MathhubtoSymbolPropagationDialog } from "./MathhubtoSymbolPropagationDialog";
import { RenderDbSymbol, RenderSymbolicUri } from "./RenderUri";
import { ResultsSection } from "./ResultsSection";
import { SearchBar } from "./SearchBar";
import { SymbolPropagationDialog } from "./SymbolPropagationDialog";

type PendingPropagation = {
  localSymbolUri: string;
  mathHubUri: string;
  primaryDefinitionId: string;
};

type PendingMathHubToLocal = {
  mathHubUri: string;
  localSymbolUri: string;
  targetType: "definiendum" | "symref";
  primaryDefinitionId: string;
};

type Props = {
  opened: boolean;
  onClose: () => void;
  definition: SemanticDefinition | null;
  onReplaceNode: OnReplaceNode;
  onDeleteNode: OnDeleteNode;
};

export function SemanticPanel({ opened, onClose, definition, onReplaceNode, onDeleteNode }: Props) {
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [selectedUri, setSelectedUri] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingPropagation, setPendingPropagation] =
    useState<PendingPropagation | null>(null);

  const { definienda, symbolicRefs } = useMemo(() => {
    if (!definition) return { definienda: [], symbolicRefs: [] };
    return extractSemanticIndex(definition.statement, definition);
  }, [definition]);

  const { results, isLoading: searchLoading } = useSymbolSearch(searchQuery);

  const selectedDefiniendum = definienda.find((d) => d.uri === selectedNode?.uri);

  const selectedSymref = symbolicRefs.find((s) => s.uri === selectedNode?.uri);

  const canMakeNewSymbol =
    selectedNode?.type === "definiendum" &&
    !!selectedUri &&
    selectedDefiniendum !== undefined &&
    !selectedDefiniendum.symdecl;

  const dbResults: DbSymbolResult[] = useMemo(
    () => results.filter((r): r is DbSymbolResult => r.source === "DB"),
    [results],
  );

  const mathhubResults: MathhubResult[] = useMemo(
    () => results.filter((r): r is MathhubResult => r.source === "MATHHUB"),
    [results],
  );

  function handleClose() {
    setSearchInput("");
    setSearchQuery("");
    setSelectedNode(null);
    setSelectedUri("");
    onClose();
  }

  async function handleReplaceNode(...args: Parameters<OnReplaceNode>) {
    return onReplaceNode(...args);
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title="Manage Semantics"
        size="80%"
        padding="md"
        centered
        overlayProps={{ opacity: 0.55, blur: 3 }}
      >
        {!definition ? (
          <Center h={300}>
            <Text c="dimmed">No definition selected</Text>
          </Center>
        ) : (
          <Flex h="70vh" style={{ overflow: "hidden" }}>
            <Box w={280} pr="sm" style={{ borderRight: "1px solid #e5e7eb", overflowY: "auto" }}>
              <Stack gap="md">
                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    Definienda
                  </Text>

                  {definienda.map((d) => (
                    <Paper
                      key={d.uri}
                      p="xs"
                      withBorder
                      bg={selectedNode?.uri === d.uri ? "blue.0" : undefined}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedNode({ type: "definiendum", uri: d.uri });
                        setSelectedUri(d.uri);
                      }}
                    >
                      <Group gap={6} justify="space-between" wrap="nowrap">
                        <Text size="sm" truncate>
                          {d.text}
                        </Text>
                        {d.symdecl && (
                          <Text size="10px" c="blue" fw={700}>
                            NEW
                          </Text>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>

                <Stack gap="xs">
                  <Text fw={600} size="sm">
                    Symbolic Ref
                  </Text>

                  {symbolicRefs.map((s) => (
                    <Paper
                      key={s.uri}
                      p="xs"
                      withBorder
                      bg={selectedNode?.uri === s.uri ? "teal.0" : undefined}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedNode({ type: "symref", uri: s.uri });
                        setSelectedUri("");
                      }}
                    >
                      <Text size="sm" truncate>
                        {s.text}
                      </Text>
                    </Paper>
                  ))}
                </Stack>
              </Stack>
            </Box>

            <Box
              flex={1}
              pl="md"
              style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
            >
              <Box style={{ flex: 1, overflowY: "auto" }}>
                {!selectedNode && (
                  <Center h="100%">
                    <Text c="dimmed">Select Definienda/Symbolic Ref</Text>
                  </Center>
                )}

                {selectedNode?.type === "definiendum" && selectedDefiniendum !== undefined && (
                  <Stack>
                    <SearchBar
                      value={searchInput}
                      onChange={setSearchInput}
                      onSearch={() => setSearchQuery(searchInput)}
                    />

                    <Group gap={4} wrap="nowrap">
                      <Text size="xs" c={selectedDefiniendum.symdecl ? "blue" : "dimmed"} fw={600}>
                        {selectedDefiniendum.symdecl
                          ? "NEW URI currently in use :"
                          : "URI currently in use :"}
                      </Text>

                      <CurrentUriDisplay uri={selectedDefiniendum.uri} />
                    </Group>

                      <Paper withBorder p="sm">
                        <Group justify="space-between">
                          <Text size="sm">{selectedDefiniendum.uri}</Text>

                        <Group gap={6}>
                          <Button
                            size="xs"
                            style={{ flexShrink: 0 }}
                            disabled={!canMakeNewSymbol}
                            onClick={async () => {
                              const newUri = selectedUri;
                              await handleReplaceNode(
                                definition.id,
                                {
                                  type: "definiendum",
                                  uri: selectedDefiniendum.uri,
                                },
                                {
                                  type: "definiendum",
                                  uri: newUri,
                                  symdecl: true,
                                },
                              );
                              setSelectedNode({
                                type: "definiendum",
                                uri: newUri,
                              });
                              setSelectedUri("");
                            }}
                          >
                            Make new symbol
                          </Button>

                          <Button
                            size="xs"
                            color="red"
                            onClick={() =>
                              onDeleteNode(definition.id, {
                                type: "definiendum",
                                uri: selectedDefiniendum.uri,
                              })
                            }
                          >
                            Delete
                          </Button>
                        </Group>
                      </Group>
                    </Paper>

                    <ResultsSection isLoading={searchLoading}>
                      <>
                        {dbResults.length > 0 && (
                          <Stack gap="xs">
                            <Text size="xs" fw={600} c="dimmed">
                              Local DB
                            </Text>

                              {dbResults.map((r) => (
                                <DbResultItem
                                  key={r.id}
                                  r={r}
                                  definition={definition}
                                  mode={{
                                    type: "definiendum",
                                    selected: selectedDefiniendum,
                                  }}
                                  selectedUri={selectedUri}
                                  setSelectedUri={setSelectedUri}
                                  onReplaceNode={handleReplaceNode}
                                  setSelectedNode={setSelectedNode}
                                />
                              ))}
                            </Stack>
                          )}

                        {mathhubResults.length > 0 && (
                          <Stack gap="xs" mt="sm">
                            <Text size="xs" fw={600} c="dimmed">
                              MathHub
                            </Text>

                            {mathhubResults.map((r) => (
                              <Paper
                                key={r.uri}
                                withBorder
                                p="xs"
                                style={{ cursor: "pointer" }}
                                bg={selectedUri === r.uri ? "blue.0" : undefined}
                                onClick={() => setSelectedUri(r.uri)}
                              >
                                <Group justify="space-between" wrap="nowrap" align="center">
                                  <Box
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      overflow: "hidden",
                                    }}
                                  >
                                    <RenderSymbolicUri uri={r.uri} />
                                  </Box>

                                  <Button
                                    size="xs"
                                    style={{ flexShrink: 0 }}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const newUri = r.uri;
                                      setPendingPropagation({
                                        localSymbolUri: selectedDefiniendum.uri,
                                        mathHubUri: newUri,
                                        primaryDefinitionId: definition.id,
                                      });
                                      setSelectedNode({
                                        type: "definiendum",
                                        uri: newUri,
                                      });
                                      setSelectedUri(newUri);
                                    }}
                                  >
                                    Use this
                                  </Button>
                                </Group>

                                <Box mt="xs" h={140}>
                                  <iframe
                                    src={r.uri.replace("http:", "https:")}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      border: "none",
                                    }}
                                  />
                                </Box>
                              </Paper>
                            ))}
                          </Stack>
                        )}
                      </>
                    </ResultsSection>
                  </Stack>
                )}

                {selectedNode?.type === "symref" && selectedSymref !== undefined && (
                  <Stack>
                    <SearchBar
                      value={searchInput}
                      onChange={setSearchInput}
                      onSearch={() => setSearchQuery(searchInput)}
                    />

                    <Group gap={6} wrap="nowrap">
                      <Text size="sm">Current URI:</Text>
                      <CurrentUriDisplay uri={selectedSymref.uri} />
                    </Group>

                      <Paper withBorder p="sm">
                        <Group justify="space-between">
                          <Text size="sm">{selectedSymref.text}</Text>

                        <Group gap={6}>
                          <Button
                            size="xs"
                            color="red"
                            onClick={() =>
                              onDeleteNode(definition.id, {
                                type: "symref",
                                uri: selectedSymref.uri,
                              })
                            }
                          >
                            Delete
                          </Button>
                        </Group>
                      </Group>
                    </Paper>

                    <ResultsSection isLoading={searchLoading}>
                      <>
                        {dbResults.length > 0 && (
                          <Stack gap="xs">
                            <Text size="xs" fw={600} c="dimmed">
                              Local DB
                            </Text>

                              {dbResults.map((r) => (
                                <DbResultItem
                                  key={r.id}
                                  r={r}
                                  definition={definition}
                                  mode={{
                                    type: "symref",
                                    selected: selectedSymref,
                                  }}
                                  onReplaceNode={handleReplaceNode}
                                  setSelectedNode={setSelectedNode}
                                />
                              ))}
                            </Stack>
                          )}

                        {mathhubResults.length > 0 && (
                          <Stack gap="xs" mt="sm">
                            <Text size="xs" fw={600} c="dimmed">
                              MathHub
                            </Text>

                            {mathhubResults.map((r) => (
                              <Paper key={r.uri} withBorder p="xs">
                                <Group justify="space-between" wrap="nowrap" align="center">
                                  <RenderSymbolicUri uri={r.uri} />

                                  <Button
                                    size="xs"
                                    style={{ flexShrink: 0 }}
                                    onClick={async () => {
                                      const newUri = r.uri;
                                      await handleReplaceNode(
                                        definition.id,
                                        {
                                          type: "symref",
                                          uri: selectedSymref.uri,
                                        },
                                        { type: "symref", uri: newUri },
                                      );
                                      setSelectedNode({
                                        type: "symref",
                                        uri: newUri,
                                      });
                                    }}
                                  >
                                    Use this
                                  </Button>
                                </Group>

                                <Box mt="xs" h={140}>
                                  <iframe
                                    src={r.uri}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      border: "none",
                                    }}
                                  />
                                </Box>
                              </Paper>
                            ))}
                          </Stack>
                        )}
                      </>
                    </ResultsSection>
                  </Stack>
                )}
              </Box>

              <Box
                pt="sm"
                mt="sm"
                style={{
                  borderTop: "1px solid var(--mantine-color-gray-3)",
                  background: "white",
                }}
              >
                <Group justify="flex-end">
                  <Button variant="default" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleClose}>Close</Button>
                </Group>
              </Box>
            </Box>
          </Flex>
        )}
      </Modal>

      {pendingPropagation && (
        <SymbolPropagationDialog
          opened={pendingPropagation !== null}
          localSymbolUri={pendingPropagation.localSymbolUri}
          mathHubUri={pendingPropagation.mathHubUri}
          primaryDefinitionId={pendingPropagation.primaryDefinitionId}
          onReplaceNode={onReplaceNode}
          onDone={() => {
            setPendingPropagation(null);
          }}
          onSkip={() => setPendingPropagation(null)}
        />
      )}

      {pendingMathHubToLocal && (
        <MathhubtoSymbolPropagationDialog
          opened={pendingMathHubToLocal !== null}
          mathHubUri={pendingMathHubToLocal.mathHubUri}
          localSymbolUri={pendingMathHubToLocal.localSymbolUri}
          targetType={pendingMathHubToLocal.targetType}
          primaryDefinitionId={pendingMathHubToLocal.primaryDefinitionId}
          onReplaceNode={onReplaceNode}
          onDone={() => setPendingMathHubToLocal(null)}
          onCancel={() => setPendingMathHubToLocal(null)}
        />
      )}
    </>
  );
}
