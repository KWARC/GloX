import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
import { ReplacePayload } from "@/server/parseUri";
import { useSymbolSearch } from "@/server/useSymbolSearch";
import { FtmlStatement } from "@/types/ftml.types";
import {
  Box,
  Button,
  Center,
  Flex,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { RenderDbSymbol, RenderSymbolicUri } from "./RenderUri";

type Props = {
  opened: boolean;
  onClose: () => void;
  definition: {
    id: string;
    statement: FtmlStatement;
    symbolicRefs?: {
      symbolicReference: { id: string; conceptUri: string };
    }[];
  } | null;
  onReplaceNode: (
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
    payload: ReplacePayload,
  ) => void;
  onDeleteNode: (
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ) => void;
};

type SelectedNode =
  | { type: "definiendum"; uri: string }
  | { type: "symref"; uri: string }
  | null;

export function SemanticPanel({
  opened,
  onClose,
  definition,
  onReplaceNode,
  onDeleteNode,
}: Props) {
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [selectedUri, setSelectedUri] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { definienda, symbolicRefs } = useMemo(() => {
    if (!definition) return { definienda: [], symbolicRefs: [] };
    return extractSemanticIndex(definition.statement, definition);
  }, [definition]);

  const { results, isLoading: loading } = useSymbolSearch(searchQuery);

  const selectedDefiniendum = definienda.find(
    (d) => d.uri === selectedNode?.uri,
  );

  const selectedSymref = symbolicRefs.find((s) => s.uri === selectedNode?.uri);

  const canMakeNewSymbol =
    selectedNode?.type === "definiendum" && !!selectedUri;

  function handleClose() {
    setSearchInput("");
    setSearchQuery("");
    setSelectedNode(null);
    setSelectedUri("");
    onClose();
  }

  return (
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
          <Box
            w={280}
            pr="sm"
            style={{
              borderRight: "1px solid #e5e7eb",
              overflowY: "auto",
            }}
          >
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
                    <Text size="sm" truncate>
                      {d.text}
                    </Text>
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
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <Box style={{ flex: 1, overflowY: "auto" }}>
              {!selectedNode && (
                <Center h="100%">
                  <Text c="dimmed">Select Definienda/Symbolic Ref</Text>
                </Center>
              )}

              {selectedNode?.type === "definiendum" && selectedDefiniendum && (
                <Stack>
                  <Group>
                    <TextInput
                      placeholder="Search "
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.currentTarget.value)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      size="xs"
                      onClick={() => setSearchQuery(searchInput)}
                    >
                      Search
                    </Button>
                  </Group>

                  <Tooltip label={selectedDefiniendum.uri} withArrow>
                    <Group gap={4} wrap="nowrap">
                      {selectedDefiniendum.symdecl && (
                        <Text size="xs" c="blue" fw={600}>
                          NEW
                        </Text>
                      )}

                      <Box
                        style={{
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {selectedDefiniendum.uri.startsWith("http") ? (
                          <RenderSymbolicUri uri={selectedDefiniendum.uri} />
                        ) : (
                          <RenderDbSymbol
                            symbol={{
                              symbolName: selectedDefiniendum.uri,
                              source: "DB",
                              futureRepo: "",
                            }}
                          />
                        )}
                      </Box>
                    </Group>
                  </Tooltip>

                  <Paper withBorder p="sm">
                    <Group justify="space-between">
                      <Text size="sm">{selectedDefiniendum.text}</Text>

                      <Group gap={6}>
                        <Button
                          size="xs"
                          style={{ flexShrink: 0 }}
                          disabled={!canMakeNewSymbol}
                          onClick={() => {
                            const newUri = selectedUri;
                            onReplaceNode(
                              definition.id,
                              {
                                type: "definiendum",
                                uri: selectedDefiniendum.uri,
                              },
                              {
                                type: "definiendum",
                                uri: selectedUri,
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

                  <Box
                    style={{
                      border: "1px solid var(--mantine-color-gray-3)",
                      borderRadius: 6,
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                    }}
                  >
                    {loading && (
                      <Group justify="center" p="sm">
                        <Loader size="sm" />
                      </Group>
                    )}

                    {!loading && (
                      <>
                        {results.filter((r) => r.source === "DB").length >
                          0 && (
                          <Stack gap="xs">
                            <Text size="xs" fw={600} c="dimmed">
                              Local DB
                            </Text>

                            {results
                              .filter((r) => r.source === "DB")
                              .map((r) => (
                                <Paper
                                  key={r.id}
                                  withBorder
                                  p="xs"
                                  style={{ cursor: "pointer" }}
                                  bg={
                                    selectedUri === r.symbolName
                                      ? "blue.0"
                                      : undefined
                                  }
                                  onClick={() => setSelectedUri(r.symbolName)}
                                >
                                  <Group
                                    justify="space-between"
                                    wrap="nowrap"
                                    align="center"
                                  >
                                    <Box
                                      style={{
                                        flex: 1,
                                        minWidth: 0,
                                        overflow: "hidden",
                                      }}
                                    >
                                      <RenderDbSymbol
                                        symbol={{
                                          symbolName: r.symbolName,
                                          source: "DB",
                                          futureRepo: r.futureRepo,
                                        }}
                                      />
                                    </Box>

                                    <Button
                                      size="xs"
                                      style={{ flexShrink: 0 }}
                                      onClick={(e) => {
                                        e.stopPropagation();

                                        const newUri = r.symbolName;

                                        onReplaceNode(
                                          definition.id,
                                          {
                                            type: "definiendum",
                                            uri: selectedDefiniendum.uri,
                                          },
                                          {
                                            type: "definiendum",
                                            uri: newUri,
                                            symdecl: false,
                                          },
                                        );

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
                                </Paper>
                              ))}
                          </Stack>
                        )}

                        {results.filter((r) => r.source === "MATHHUB").length >
                          0 && (
                          <Stack gap="xs" mt="sm">
                            <Text size="xs" fw={600} c="dimmed">
                              MathHub
                            </Text>

                            {results
                              .filter((r) => r.source === "MATHHUB")
                              .map((r) => (
                                <Paper
                                  key={r.uri}
                                  withBorder
                                  p="xs"
                                  style={{ cursor: "pointer" }}
                                  bg={
                                    selectedUri === r.uri ? "blue.0" : undefined
                                  }
                                  onClick={() => setSelectedUri(r.uri)}
                                >
                                  <Group
                                    justify="space-between"
                                    wrap="nowrap"
                                    align="center"
                                  >
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
                                      onClick={(e) => {
                                        e.stopPropagation();

                                        const newUri = r.uri;

                                        onReplaceNode(
                                          definition.id,
                                          {
                                            type: "definiendum",
                                            uri: selectedDefiniendum.uri,
                                          },
                                          {
                                            type: "definiendum",
                                            uri: newUri,
                                            symdecl: false,
                                          },
                                        );

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
                    )}
                  </Box>
                </Stack>
              )}

              {selectedNode?.type === "symref" && selectedSymref && (
                <Stack>
                  <Group>
                    <TextInput
                      placeholder="Search "
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.currentTarget.value)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      size="xs"
                      onClick={() => setSearchQuery(searchInput)}
                    >
                      Search
                    </Button>
                  </Group>

                  <Group gap={6} wrap="nowrap">
                    <Text size="sm">Current URI:</Text>

                    <Tooltip label={selectedSymref.uri} withArrow>
                      <Box
                        style={{
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {selectedSymref.uri.startsWith("http") ? (
                          <RenderSymbolicUri uri={selectedSymref.uri} />
                        ) : (
                          <RenderDbSymbol
                            symbol={{
                              symbolName: selectedSymref.uri,
                              source: "DB",
                              futureRepo: "",
                            }}
                          />
                        )}
                      </Box>
                    </Tooltip>
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

                  <Box
                    style={{
                      border: "1px solid var(--mantine-color-gray-3)",
                      borderRadius: 6,
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                    }}
                  >
                    {loading && (
                      <Group justify="center" p="sm">
                        <Loader size="sm" />
                      </Group>
                    )}

                    {!loading && (
                      <>
                        {results.filter((r) => r.source === "DB").length >
                          0 && (
                          <Stack gap="xs">
                            <Text size="xs" fw={600} c="dimmed">
                              Local DB
                            </Text>

                            {results
                              .filter((r) => r.source === "DB")
                              .map((r) => (
                                <Paper key={r.id} withBorder p="xs">
                                  <Group
                                    justify="space-between"
                                    wrap="nowrap"
                                    align="center"
                                  >
                                    <RenderDbSymbol
                                      symbol={{
                                        symbolName: r.symbolName,
                                        source: "DB",
                                        futureRepo: r.futureRepo,
                                      }}
                                    />

                                    <Button
                                      size="xs"
                                      style={{ flexShrink: 0 }}
                                      onClick={() => {
                                        const newUri = r.symbolName;

                                        onReplaceNode(
                                          definition.id,
                                          {
                                            type: "symref",
                                            uri: selectedSymref.uri,
                                          },
                                          {
                                            type: "symref",
                                            uri: newUri,
                                          },
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
                                </Paper>
                              ))}
                          </Stack>
                        )}

                        {results.filter((r) => r.source === "MATHHUB").length >
                          0 && (
                          <Stack gap="xs" mt="sm">
                            <Text size="xs" fw={600} c="dimmed">
                              MathHub
                            </Text>

                            {results
                              .filter((r) => r.source === "MATHHUB")
                              .map((r) => (
                                <Paper key={r.uri} withBorder p="xs">
                                  <Group
                                    justify="space-between"
                                    wrap="nowrap"
                                    align="center"
                                  >
                                    <RenderSymbolicUri uri={r.uri} />

                                    <Button
                                      size="xs"
                                      style={{ flexShrink: 0 }}
                                      onClick={() => {
                                        const newUri = r.uri;

                                        onReplaceNode(
                                          definition.id,
                                          {
                                            type: "symref",
                                            uri: selectedSymref.uri,
                                          },
                                          {
                                            type: "symref",
                                            uri: newUri,
                                          },
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
                    )}
                  </Box>
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
  );
}
