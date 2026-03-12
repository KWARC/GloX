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
}

function normalizeUri(uri: string) {
  if (uri.includes("stexmmt.mathhub.info/:sTeX")) {
    return uri.replace("stexmmt.mathhub.info/:sTeX", "https://mathhub.info");
  }

  return uri;
}

export function DuplicateDefinitionDialog({
  opened,
  onClose,
  extracts,
}: Props) {
  const [query, setQuery] = useState("");

  const { results, loading } = searchForDuplicateDefinition(query);

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

              {results.map((uri) => (
                <Paper key={uri} withBorder radius="md" p={0}>
                  <Box
                    px="xs"
                    py={6}
                    style={{
                      borderBottom: "1px solid var(--mantine-color-gray-2)",
                      background: "var(--mantine-color-gray-0)",
                    }}
                  >
                    <RenderSymbolicUri uri={uri} />
                  </Box>

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
              ))}
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
