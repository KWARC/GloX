import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
import { ActionIcon, Group, Modal, Stack, Text } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";

export function SemanticPanel({
  opened,
  onClose,
  definition,
  onEditDefiniendum,
  onEditSymbolicRef,
  onDeleteNode,
}: {
  opened: boolean;
  onClose: () => void;
  definition: any | null;
  onEditDefiniendum: (definitionId: string, def: any) => void;
  onEditSymbolicRef: (definitionId: string, ref: any) => void;
  onDeleteNode: (
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ) => void;
}) {
  if (!definition) return null;

  const { definienda, symbolicRefs } = extractSemanticIndex(
    definition.statement,
  );

  return (
    <Modal opened={opened} onClose={onClose} title="Manage Semantics" size="md">
      <Stack gap="lg">
        {/* DEFINIENDA */}
        <Stack gap="xs">
          <Text fw={600} size="sm">
            Definienda
          </Text>

          {definienda.length === 0 ? (
            <Text size="sm" c="dimmed">
              No definienda in this definition.
            </Text>
          ) : (
            definienda.map((def) => (
              <Group key={def.uri} justify="space-between">
                <Text>{def.text}</Text>

                <Group gap="xs">
                  <ActionIcon
                    size="sm"
                    onClick={() => onEditDefiniendum(definition.id, def)}
                  >
                    <IconPencil size={14} />
                  </ActionIcon>

                  <ActionIcon
                    size="sm"
                    color="red"
                    onClick={() =>
                      onDeleteNode(definition.id, {
                        type: "definiendum",
                        uri: def.uri,
                      })
                    }
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            ))
          )}
        </Stack>

        {/* SYMBOLIC REFERENCES */}
        <Stack gap="xs">
          <Text fw={600} size="sm">
            Symbolic References
          </Text>

          {symbolicRefs.length === 0 ? (
            <Text size="sm" c="dimmed">
              No symbolic references in this definition.
            </Text>
          ) : (
            symbolicRefs.map((ref) => (
              <Group key={ref.uri} justify="space-between">
                <Text>{ref.text}</Text>

                <Group gap="xs">
                  <ActionIcon
                    size="sm"
                    onClick={() => onEditSymbolicRef(definition.id, ref)}
                  >
                    <IconPencil size={14} />
                  </ActionIcon>

                  <ActionIcon
                    size="sm"
                    color="red"
                    onClick={() =>
                      onDeleteNode(definition.id, {
                        type: "symref",
                        uri: ref.uri,
                      })
                    }
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            ))
          )}
        </Stack>
      </Stack>
    </Modal>
  );
}
