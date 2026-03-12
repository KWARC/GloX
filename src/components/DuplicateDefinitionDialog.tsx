import { searchForDuplicateDefinition } from "@/server/ftml/searchForDuplicateDef";
import { ExtractedItem } from "@/server/text-selection";
import {
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { ExtractedTextPanel } from "./ExtractedTextList";
import { RenderSymbolicUri } from "./RenderUri";

interface Props {
  opened: boolean;
  onClose: () => void;
  extracts: ExtractedItem[];
  onConfirm: (duplicates: string[]) => void;
}

function normalizeUri(uri: string) {
  try {
    if (uri.includes("stexmmt.mathhub.info/:sTeX")) {
      uri = uri.replace("stexmmt.mathhub.info/:sTeX", "https://mathhub.info");
    }

    const url = new URL(uri);

    if (url.protocol !== "https:") {
      url.protocol = "https:";
    }

    return url.toString();
  } catch {
    return uri;
  }
}

export function DuplicateDefinitionDialog({
  opened,
  onClose,
  extracts,
  onConfirm,
}: Props) {
  const [query, setQuery] = useState("");
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const { results, loading } = searchForDuplicateDefinition(query);

  function toggleDuplicate(uri: string) {
    setDuplicates((prev) =>
      prev.includes(uri) ? prev.filter((u) => u !== uri) : [...prev, uri],
    );
  }
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="90%"
      padding="lg"
      title="Duplicate Definition Check"
    >
      <Group align="stretch" gap="lg" style={{ height: "75vh" }}>
        <Box style={{ width: "40%", display: "flex", flexDirection: "column" }}>
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
        </Box>

        <Stack style={{ flex: 1 }}>
          <Group>
            <TextInput
              placeholder="Search duplicate definition"
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button>Search</Button>
          </Group>

          <ScrollArea style={{ flex: 1 }}>
            <Stack gap="sm">
              {loading && (
                <Group justify="center">
                  <Loader size="sm" />
                </Group>
              )}

              {results.map((uri) => {
                const marked = duplicates.includes(uri);

                return (
                  <Paper key={uri} withBorder radius="md" p={0}>
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
                        size="xs"
                        color="red"
                        variant={marked ? "filled" : "light"}
                        onClick={() => {
                          let next: string[];

                          if (duplicates.includes(uri)) {
                            next = duplicates.filter((u) => u !== uri);
                          } else {
                            next = [...duplicates, uri];
                          }

                          setDuplicates(next);
                          onConfirm(next);
                        }}
                      >
                        {marked ? "Markeded as Duplicate" : "Mark as duplicate"}
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
            </Stack>
          </ScrollArea>

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Group>
    </Modal>
  );
}
