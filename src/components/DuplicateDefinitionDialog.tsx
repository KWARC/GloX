import { queryClient } from "@/queryClient";
import { searchForDuplicateDefinition } from "@/server/ftml/searchForDuplicateDef";
import { ExtractedItem } from "@/server/text-selection";
import { updateDefinitionsStatusByIdentity } from "@/serverFns/definitionStatus.server";
import { FileIdentity } from "@/serverFns/latex.server";
import {
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { ExtractedTextPanel } from "./ExtractedTextList";
import { RenderSymbolicUri } from "./RenderUri";

interface Props {
  opened: boolean;
  onClose: () => void;
  extracts: ExtractedItem[];
  identity: FileIdentity;
  onConfirm: (duplicates: string[]) => void;
}

function normalizeUri(uri: string) {
  try {
    if (uri.includes("stexmmt.mathhub.info/:sTeX")) {
      uri = uri.replace("stexmmt.mathhub.info/:sTeX", "https://mathhub.info");
    }
    const url = new URL(uri);
    if (url.protocol !== "https:") url.protocol = "https:";
    return url.toString();
  } catch {
    return uri;
  }
}

export function DuplicateDefinitionDialog({
  opened,
  onClose,
  extracts,
  identity,
}: Props) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [duplicates, setDuplicates] = useState<string[]>([]);

  const { results, loading } = searchForDuplicateDefinition(search);

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setDuplicates([]);
        onClose();
      }}
      size="90%"
      padding="lg"
      title="Duplicate Definition Check"
    >
      <Box
        style={{
          height: "75vh",
          display: "grid",
          gridTemplateRows: "1fr auto",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            minHeight: 0,
          }}
        >
          <Box
            style={{
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <ScrollArea h="100%" type="auto" scrollbarSize={6}>
              <ExtractedTextPanel
                extracts={extracts}
                editingId={null}
                selectedId={null}
                onToggleEdit={() => {}}
                onUpdate={async () => {}}
                onDelete={() => {}}
                onSelection={() => {}}
                onOpenSemanticPanel={() => {}}
                showPageNumber={false}
                showDefinitionMetaIconOnly
                isLocked
              />
            </ScrollArea>
          </Box>

          <Box
            style={{
              display: "grid",
              gridTemplateRows: "auto 1fr",
              minHeight: 0,
            }}
          >
            <Group mb={8}>
              <TextInput
                placeholder="Search duplicate definition"
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button onClick={() => setSearch(input)}>Search</Button>
            </Group>

            <ScrollArea h="100%" type="auto" scrollbarSize={6}>
              <Box p="xs">
                {loading && (
                  <Group justify="center">
                    <Loader size="sm" />
                  </Group>
                )}

                {results.map((uri) => {
                  const marked = duplicates.includes(uri);

                  return (
                    <Paper
                      key={uri}
                      withBorder
                      radius="md"
                      p={0}
                      mb="sm"
                      style={{ overflow: "hidden" }}
                    >
                      <Group
                        justify="space-between"
                        px="xs"
                        py={6}
                        style={{
                          borderBottom: "1px solid var(--mantine-color-gray-2)",
                          background: marked
                            ? "var(--mantine-color-red-0)"
                            : "var(--mantine-color-gray-0)",
                        }}
                      >
                        <RenderSymbolicUri uri={uri} />
                        <Button
                          color="red"
                          size="xs"
                          onClick={async () => {
                            await updateDefinitionsStatusByIdentity({
                              data: {
                                identity,
                                status: "DISCARDED",
                                discardedReason: `Duplicate of - ${uri}`,
                              },
                            });

                            await queryClient.invalidateQueries({
                              queryKey: ["definitionsByIdentity", identity],
                            });

                            alert("Marked duplicate is discarded");
                            onClose();
                          }}
                        >
                          Mark as duplicate
                        </Button>
                      </Group>

                      <Box style={{ height: 220 }}>
                        <iframe
                          src={normalizeUri(uri)}
                          style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                          }}
                        />
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </ScrollArea>
          </Box>
        </Box>

        <Box
          style={{
            borderTop: "1px solid var(--mantine-color-gray-2)",
            paddingTop: 10,
            marginTop: 8,
          }}
        >
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setDuplicates([]);
                onClose();
              }}
            >
              Cancel
            </Button>
          </Group>
        </Box>
      </Box>
    </Modal>
  );
}
