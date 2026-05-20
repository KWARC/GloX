import { SelectedNode } from "@/types/Semantic.types";
import { Box, Group, Paper, Stack, Text } from "@mantine/core";
import { SemanticPanelState } from "./useSemanticPanelState";

export type SemanticNodeListProps = {
  state: Pick<
    SemanticPanelState,
    "definienda" | "symbolicRefs" | "setSelectedNode" | "setSelectedUri"
  > & {
    selectedNode: SelectedNode;
  };
};

export function SemanticNodeList({ state }: SemanticNodeListProps) {
  const {
    definienda,
    symbolicRefs,
    selectedNode,
    setSelectedNode,
    setSelectedUri,
  } = state;

  return (
    <Box
      w={280}
      pr="sm"
      style={{ borderRight: "1px solid #e5e7eb", overflowY: "auto" }}
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
  );
}
