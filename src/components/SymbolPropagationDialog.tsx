import {
  PropagationCandidate,
  applySymbolPropagation,
  getDefinitionsReferencingSymbol,
} from "@/serverFns/SymbolPropagation.server";
import { OnReplaceNode } from "@/types/Semantic.types";
import {
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

      await applySymbolPropagation({
        data: {
          selectedDefinitionIds: candidates.map((c) => c.id),
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

  // async function handleSkip() {
  //   setApplying(true);
  //   try {
  //     await onReplaceNode(
  //       primaryDefinitionId,
  //       { type: "definiendum", uri: localSymbolUri },
  //       {
  //         type: "definiendum",
  //         uri: mathHubUri,
  //         symdecl: false,
  //       },
  //     );
  //   } finally {
  //     setApplying(false);
  //   }

  //   onSkip();
  // }

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
            is referenced in these definitions. All will be updated.
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
          <Text size="sm" c="dimmed">
            {candidates.length} definition
            {candidates.length !== 1 ? "s" : ""} will be updated
          </Text>

          <Stack gap="xs" mah={360} style={{ overflowY: "auto" }}>
            {candidates.map((c) => (
              <Paper key={c.id} withBorder p="sm" radius="md" bg="gray.0">
                <Stack gap={6}>
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
              </Paper>
            ))}
          </Stack>
        </Stack>
      )}

      <Group justify="flex-end" mt="lg" gap="sm">
        <Button variant="default" onClick={onSkip} loading={applying}>
          Cancel
        </Button>
        <Button onClick={handleApply} loading={applying} disabled={isLoading}>
          Confirm replace
        </Button>
      </Group>
    </Modal>
  );
}
