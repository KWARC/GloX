import {
  PropagationCandidate,
  applySymbolPropagation,
  getDefinitionsReferencingSymbol,
} from "@/serverFns/SymbolPropagation.server";
import { OnReplaceNode } from "@/types/Semantic.types";
import {
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

interface SymbolPropagationDialogProps {
  opened: boolean;
  localSymbolUri: string;
  mathHubUri: string;
  primaryDefinitionId: string;
  onReplaceNode: OnReplaceNode;
  onDone: () => void;
  onSkip: () => void;
}

export function SymbolPropagationDialog({
  opened,
  localSymbolUri,
  mathHubUri,
  primaryDefinitionId,
  onReplaceNode,
  onDone,
  onSkip,
}: SymbolPropagationDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const { data: candidates = [], isLoading } = useQuery<PropagationCandidate[]>(
    {
      queryKey: ["propagation-candidates", localSymbolUri, primaryDefinitionId],
      queryFn: () =>
        getDefinitionsReferencingSymbol({
          data: { localSymbolUri, excludeDefinitionId: primaryDefinitionId },
        }),
      enabled: opened,
    },
  );

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(candidates.map((c) => c.id)) : new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  useEffect(() => {
    if (opened && candidates.length > 0) {
      setSelected(new Set(candidates.map((c) => c.id)));
    }
  }, [opened, candidates]);

  async function handleApply() {
    setApplying(true);
    try {
      await onReplaceNode(
        primaryDefinitionId,
        { type: "definiendum", uri: localSymbolUri },
        {
          type: "definiendum",
          uri: mathHubUri,
          symdecl: false,
        },
      );

      // 2. propagate selected
      await applySymbolPropagation({
        data: {
          selectedDefinitionIds: Array.from(selected),
          localSymbolUri,
          mathHubUri,
          primaryDefinitionId,
        },
      });

      onDone();
    } finally {
      setApplying(false);
    }
  }

  async function handleSkip() {
    setApplying(true);
    try {
      await onReplaceNode(
        primaryDefinitionId,
        { type: "definiendum", uri: localSymbolUri },
        {
          type: "definiendum",
          uri: mathHubUri,
          symdecl: false,
        },
      );
    } finally {
      setApplying(false);
    }

    onSkip();
  }

  const allChecked =
    candidates.length > 0 && selected.size === candidates.length;
  const hasCandidates = candidates.length > 0;
  return (
    <Modal
      opened={opened}
      onClose={onSkip}
      title={
        <Stack gap={2}>
          <Text fw={600} size="md">
            Symbol Replacement
          </Text>
          <Text size="xs" c="dimmed">
            The local symbol{" "}
            <Text span ff="monospace" fw={600}>
              {localSymbolUri}
            </Text>{" "}
            was referenced in another Definition. Choose which other definitions
            should also be updated.
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
      ) : candidates.length === 0 ? (
        <Paper p="md" withBorder bg="gray.0" radius="md">
          <Text size="sm" c="dimmed" ta="center">
            No other definitions reference this symbol.
          </Text>
        </Paper>
      ) : (
        <Stack gap="sm">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {candidates.length} definition
              {candidates.length !== 1 ? "s" : ""} reference this symbol
            </Text>
            <Checkbox
              label="Select all"
              checked={allChecked}
              onChange={(e) => toggleAll(e.currentTarget.checked)}
              size="xs"
            />
          </Group>

          <Stack gap="xs" mah={360} style={{ overflowY: "auto" }}>
            {candidates.map((c) => (
              <Paper
                key={c.id}
                withBorder
                p="sm"
                radius="md"
                bg={selected.has(c.id) ? "blue.0" : undefined}
                style={{
                  borderColor: selected.has(c.id)
                    ? "var(--mantine-color-blue-4)"
                    : undefined,
                  cursor: "pointer",
                }}
                onClick={() => toggle(c.id)}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Checkbox
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    size="sm"
                  />
                  <Stack gap={6} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" ff="monospace" truncate>
                      {[c.futureRepo, c.filePath, c.fileName].join(" / ")}
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
                      <FtmlPreview ftmlAst={c.statement} docId={c.id} />
                    </Box>
                  </Stack>
                  {/* <Badge size="xs" variant="light" color="teal">
                    {c.language}
                  </Badge>
                  <Badge size="xs" variant="light" color="gray">
                    p.{c.pageNumber}
                  </Badge> */}
                </Group>
              </Paper>
            ))}
          </Stack>
        </Stack>
      )}

      <Group justify="flex-end" mt="lg" gap="sm">
        {hasCandidates ? (
          <>
            <Button variant="default" onClick={handleSkip} loading={applying}>
              Skip
            </Button>
            <Button
              onClick={handleApply}
              loading={applying}
              disabled={selected.size === 0 || isLoading}
            >
              Apply to {selected.size} definition
              {selected.size !== 1 ? "s" : ""}
            </Button>
          </>
        ) : (
          <>
            <Button variant="default" onClick={onSkip} loading={applying}>
              Cancel
            </Button>
            <Button onClick={handleSkip} loading={applying}>
              Confirm Replacement
            </Button>
          </>
        )}
      </Group>
    </Modal>
  );
}
