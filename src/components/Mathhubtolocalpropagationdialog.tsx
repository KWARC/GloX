import {
  PropagationCandidate,
  applyMathHubReplacement,
  getDefinitionsReferencingMathHubUri,
} from "@/serverFns/SymbolPropagation.server";
import { OnReplaceNode } from "@/types/Semantic.types";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FtmlPreview } from "./FtmlPreview";

interface MathHubToLocalPropagationDialogProps {
  opened: boolean;
  mathHubUri: string;
  localSymbolUri: string;
  targetType: "definiendum" | "symref";
  primaryDefinitionId: string;
  onReplaceNode: OnReplaceNode;
  onDone: () => void;
  onCancel: () => void;
}

export function MathHubToLocalPropagationDialog({
  opened,
  mathHubUri,
  localSymbolUri,
  targetType,
  primaryDefinitionId,
  onReplaceNode,
  onDone,
  onCancel,
}: MathHubToLocalPropagationDialogProps) {
  const [applying, setApplying] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: candidates = [], isLoading } = useQuery<PropagationCandidate[]>(
    {
      queryKey: [
        "mathhub-to-local-propagation-candidates",
        mathHubUri,
        primaryDefinitionId,
      ],
      queryFn: () =>
        getDefinitionsReferencingMathHubUri({
          data: { mathHubUri, excludeDefinitionId: primaryDefinitionId },
        }),
      enabled: opened,
    },
  );

  useEffect(() => {
    if (!opened) return;

    const initial = new Set<string>();
    for (const c of candidates) {
      initial.add(c.id);
    }
    setSelectedIds(initial);
  }, [candidates, opened]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(candidates.map((c) => c.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  async function handleApply() {
    setApplying(true);
    try {
      await onReplaceNode(
        primaryDefinitionId,
        { type: targetType, uri: mathHubUri },
        targetType === "definiendum"
          ? { type: "definiendum", uri: localSymbolUri, symdecl: false }
          : { type: "symref", uri: localSymbolUri },
      );

      const selectedDefinitionIds = candidates
        .filter((c) => selectedIds.has(c.id))
        .map((c) => c.id);

      if (selectedDefinitionIds.length > 0) {
        await applyMathHubReplacement({
          data: {
            selectedDefinitionIds,
            mathHubUri,
            newUri: localSymbolUri,
          },
        });
      }

      onDone();
    } finally {
      setApplying(false);
    }
  }

  const replaceCount = candidates.filter((c) => selectedIds.has(c.id)).length;

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={
        <Stack gap={2}>
          <Text fw={600} size="md">
            Replace MathHub Symbol with Local
          </Text>
          <Text size="xs" c="dimmed">
            Replace{" "}
            <Text span ff="monospace" fw={600} size="xs">
              {mathHubUri.length > 60
                ? `…${mathHubUri.slice(-50)}`
                : mathHubUri}
            </Text>{" "}
            with{" "}
            <Text span ff="monospace" fw={600} size="xs">
              {localSymbolUri}
            </Text>
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
      ) : (
        <Stack gap="sm">
          <Paper withBorder p="sm" bg="blue.0" radius="md">
            <Group gap="xs">
              <Badge size="sm" color="blue">
                Current
              </Badge>
              <Text size="xs">This definition will always be replaced.</Text>
            </Group>
          </Paper>

          {candidates.length === 0 ? (
            <Paper p="md" withBorder>
              <Text size="sm" c="dimmed" ta="center">
                No other definitions use this MathHub symbol.
              </Text>
            </Paper>
          ) : (
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {candidates.length} other definitions found
                </Text>
                <Group gap="xs">
                  <Button size="xs" onClick={selectAll}>
                    Select all
                  </Button>
                  <Button size="xs" variant="light" onClick={clearAll}>
                    Clear
                  </Button>
                </Group>
              </Group>

              <Stack mah={380} style={{ overflowY: "auto" }}>
                {candidates.map((c) => {
                  const checked = selectedIds.has(c.id);

                  return (
                    <Paper key={c.id} withBorder p="sm">
                      <Stack gap={6}>
                        <Group
                          justify="space-between"
                          align="center"
                          wrap="nowrap"
                        >
                          <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                            <Checkbox
                              checked={checked}
                              onChange={() => toggleSelection(c.id)}
                            />
                            <Text
                              size="xs"
                              ff="monospace"
                              truncate
                              style={{ flex: 1 }}
                            >
                              {[c.futureRepo, c.filePath, c.fileName].join(
                                " / ",
                              )}
                            </Text>
                          </Group>
                        </Group>

                        <Box
                          style={{
                            maxHeight: 110,
                            overflow: "hidden",
                            border: "1px solid #e5e7eb",
                            borderRadius: 6,
                            padding: 4,
                          }}
                        >
                          <FtmlPreview ftmlAst={c.statement} docId={c.id} />
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>

              {replaceCount > 0 && (
                <Text size="xs" c="dimmed">
                  {replaceCount} additional definition
                  {replaceCount !== 1 ? "s" : ""} will be updated
                </Text>
              )}
            </Stack>
          )}
        </Stack>
      )}

      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onCancel} disabled={applying}>
          Cancel
        </Button>
        <Button onClick={handleApply} loading={applying}>
          Confirm replace
        </Button>
      </Group>
    </Modal>
  );
}
