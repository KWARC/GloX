import { queryClient } from "@/queryClient";
import {
  listLocalSymbolUriHits,
  replaceLocalSymbolWithMathHub,
  type LocalSymbolUriHitView,
} from "@/serverFns/uriRetarget.server";
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FtmlPreview } from "./FtmlPreview";

const MODULE_FIELD_LABEL: Record<
  Extract<LocalSymbolUriHitView, { kind: "moduleStatement" }>["field"],
  string
> = {
  title: "Title",
  inhalt: "Inhalt",
  lernziele: "Lernziele",
};

interface MathHubDuplicateDialogProps {
  opened: boolean;
  localSymbolUri: string;
  mathHubUri: string;
  onDone: () => void;
  onSkip: () => void;
}

export function MathHubDuplicateDialog({
  opened,
  localSymbolUri,
  mathHubUri,
  onDone,
  onSkip,
}: MathHubDuplicateDialogProps) {
  const [applying, setApplying] = useState(false);

  const { data: hits = [], isLoading } = useQuery<LocalSymbolUriHitView[]>({
    queryKey: ["local-symbol-uri-hits", localSymbolUri],
    queryFn: () => listLocalSymbolUriHits({ data: { localSymbolUri } }),
    enabled: opened,
  });

  async function handleApply() {
    setApplying(true);
    try {
      await replaceLocalSymbolWithMathHub({
        data: { localSymbolUri, mathHubUri },
      });
      await queryClient.invalidateQueries();
      onDone();
    } finally {
      setApplying(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onSkip}
      title={
        <Stack gap={2}>
          <Text fw={600} size="md">
            Mark as MathHub duplicate
          </Text>
          <Text size="xs" c="dimmed">
            This local symbol is the same concept as the chosen MathHub symbol.
            Current references will use the MathHub URI; the local declaration is
            removed; definition text stays.
          </Text>
        </Stack>
      }
      size="lg"
      centered
      padding="lg"
    >
      {isLoading ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : hits.length === 0 ? (
        <Paper p="md" withBorder bg="gray.0" radius="md">
          <Text size="sm" c="dimmed" ta="center">
            No statements currently reference this symbol. Applying still drops
            the local declaration if it exists.
          </Text>
        </Paper>
      ) : (
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {hits.length} statement{hits.length !== 1 ? "s" : ""} will be
            updated
          </Text>

          <Stack gap="xs" mah={360} style={{ overflowY: "auto" }}>
            {hits.map((hit) =>
              hit.kind === "floDown" ? (
                <Paper key={`flo-${hit.id}`} withBorder p="sm" radius="md" bg="gray.0">
                  <Stack gap={6}>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="xs" ff="monospace" truncate style={{ flex: 1 }}>
                        {[hit.futureRepo, hit.filePath, hit.fileName].join(" / ")}
                      </Text>
                      {hit.status === "DISCARDED" && (
                        <Badge size="xs" color="gray" variant="light">
                          Discarded
                        </Badge>
                      )}
                    </Group>
                    <Box
                      style={{
                        maxHeight: 120,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        padding: 4,
                        background: "#fff",
                      }}
                    >
                      <FtmlPreview
                        ftmlAst={hit.statement}
                        docId={hit.id}
                        declaredSymbolsInfo={hit.declaredSymbolsInfo}
                      />
                    </Box>
                  </Stack>
                </Paper>
              ) : (
                <Paper
                  key={`mod-${hit.moduleId}-${hit.field}`}
                  withBorder
                  p="sm"
                  radius="md"
                  bg="gray.0"
                >
                  <Stack gap={6}>
                    <Text size="xs">
                      Module {hit.moduleId} · {MODULE_FIELD_LABEL[hit.field]}
                    </Text>
                    <Box
                      style={{
                        maxHeight: 120,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                        borderRadius: 6,
                        padding: 4,
                        background: "#fff",
                      }}
                    >
                      <FtmlPreview
                        ftmlAst={hit.statement}
                        docId={`${hit.moduleDescriptionId}-${hit.field}`}
                      />
                    </Box>
                  </Stack>
                </Paper>
              ),
            )}
          </Stack>
        </Stack>
      )}

      <Group justify="flex-end" mt="lg" gap="sm">
        <Button variant="default" onClick={onSkip} loading={applying}>
          Cancel
        </Button>
        <Button onClick={handleApply} loading={applying} disabled={isLoading}>
          Apply MathHub URI
        </Button>
      </Group>
    </Modal>
  );
}
