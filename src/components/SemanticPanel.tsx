import { searchForDuplicateDefinition } from "@/server/ftml/searchForDuplicateDef";
import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
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
} from "@mantine/core";
import { useMemo, useState } from "react";
import { RenderSymbolicUri } from "./RenderUri";

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
    payload: any,
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
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { definienda, symbolicRefs } = useMemo(() => {
    if (!definition) return { definienda: [], symbolicRefs: [] };
    return extractSemanticIndex(definition.statement, definition);
  }, [definition]);

  const { results, loading } = searchForDuplicateDefinition(searchQuery);

  const selectedDefiniendum = definienda.find(
    (d) => d.uri === selectedNode?.uri,
  );

  const selectedSymref = symbolicRefs.find((s) => s.uri === selectedNode?.uri);

  function handleClose() {
    setSearchInput("");
    setSearchQuery("");
    setSelectedNode(null);
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
                    onClick={() =>
                      setSelectedNode({
                        type: "definiendum",
                        uri: d.uri,
                      })
                    }
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
                    onClick={() =>
                      setSelectedNode({
                        type: "symref",
                        uri: s.uri,
                      })
                    }
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

                  <Text size="sm">Current URI: {selectedDefiniendum.uri}</Text>

                  <Paper withBorder p="sm">
                    <Group justify="space-between">
                      <Text size="sm">{selectedDefiniendum.text}</Text>

                      <Group gap={6}>
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

                    {!loading &&
                      results.map((uri) => (
                        <Paper key={uri} withBorder p="xs" m="xs">
                          <Group gap="xs" wrap="nowrap">
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <RenderSymbolicUri uri={uri} />
                            </Box>

                            <Button
                              size="xs"
                              style={{ flexShrink: 0 }}
                              onClick={() =>
                                onReplaceNode(
                                  definition.id,
                                  {
                                    type: "definiendum",
                                    uri: selectedDefiniendum.uri,
                                  },
                                  {
                                    type: "definiendum",
                                    uri,
                                    content: [uri],
                                    symdecl: false,
                                  },
                                )
                              }
                            >
                              Use this
                            </Button>
                          </Group>

                          <Box mt="xs" h={160}>
                            <iframe
                              src={uri.replace('http:','https:')}
                              style={{
                                width: "100%",
                                height: "100%",
                                border: "none",
                              }}
                            />
                          </Box>
                        </Paper>
                      ))}
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

                  <Text size="sm">Current URI: {selectedSymref.uri}</Text>

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

                    {!loading &&
                      results.map((uri) => (
                        <Paper key={uri} withBorder p="xs" m="xs">
                          <Group gap="xs" wrap="nowrap">
                            <RenderSymbolicUri uri={uri} />

                            <Button
                              size="xs"
                              style={{ flexShrink: 0 }}
                              onClick={() =>
                                onReplaceNode(
                                  definition.id,
                                  { type: "symref", uri: selectedSymref.uri },
                                  {
                                    type: "symref",
                                    uri,
                                    content: [uri],
                                  },
                                )
                              }
                            >
                              Use this
                            </Button>
                          </Group>

                          <Box mt="xs" h={160}>
                            <iframe
                              src={uri}
                              style={{
                                width: "100%",
                                height: "100%",
                                border: "none",
                              }}
                            />
                          </Box>
                        </Paper>
                      ))}
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
