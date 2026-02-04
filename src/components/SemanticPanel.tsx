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
  onEditDefiniendum: (
    definitionId: string,
    def: { uri: string; text: string; definiendumId: string },
  ) => void;
  onEditSymbolicRef: (
    definitionId: string,
    ref: { uri: string; text: string; symbolicRefId: string },
  ) => void;
  onDeleteNode: (
    definitionId: string,
    target:
      | {
          type: "definiendum";
          uri: string;
          definiendumId: string;
        }
      | {
          type: "symref";
          uri: string;
          symbolicRefId: string;
        },
  ) => void;
}) {
  if (!definition) return null;

  const { definienda, symbolicRefs } = extractSemanticIndex(
    definition.statement,
    definition,
  );

  return (
    <Modal opened={opened} onClose={onClose} title="Manage Semantics" size="md">
      <Stack gap="lg">
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
              <Group key={def.definiendumId} justify="space-between">
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
                        definiendumId: def.definiendumId,
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
              <Group key={ref.symbolicRefId} justify="space-between">
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
                        symbolicRefId: ref.symbolicRefId,
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
