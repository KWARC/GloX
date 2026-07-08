import { parseUri } from "@/server/parseUri";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Modal,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { SymbolicLinkPreview } from "./SymbolicLinkPreview";

export type MarkReferenceItem = {
  id: string;
  symbolName: string;
  verbalization: string | null;
};

function getReferenceDisplay(reference: MarkReferenceItem) {
  try {
    const parsed = parseUri(reference.symbolName);
    return {
      uri: reference.symbolName,
      label: parsed.symbol || reference.symbolName,
    };
  } catch {
    return {
      uri: reference.symbolName,
      label: reference.symbolName,
    };
  }
}

export function MarkedReferenceList({
  references,
  onDelete,
  deletingId,
}: {
  references: MarkReferenceItem[];
  onDelete?: (referenceId: string) => Promise<void>;
  deletingId?: string | null;
}) {
  const [pendingDelete, setPendingDelete] = useState<MarkReferenceItem | null>(
    null,
  );

  if (references.length === 0) return null;

  return (
    <>
      <Paper
        withBorder
        radius="sm"
        px="xs"
        py={3}
        mt="xs"
        bg="blue.0"
        style={{ borderColor: "var(--mantine-color-blue-2)" }}
      >
        <Group justify="space-between" align="flex-start" gap="xs">
          <Group gap="md" wrap="wrap" align="center" style={{ flex: 1 }}>
            {references.map((reference) => {
              const display = getReferenceDisplay(reference);

              return (
                <Box
                  key={reference.id}
                  px={6}
                  py={2}
                  style={{
                    borderRadius: 6,
                    background: "var(--mantine-color-white)",
                    maxWidth: "100%",
                  }}
                >
                  <SymbolicLinkPreview
                    uri={display.uri}
                    label={display.label}
                    compact
                  />
                </Box>
              );
            })}
          </Group>
          {onDelete && (
            <Menu withinPortal trigger="click-hover" position="bottom-end">
              <Menu.Target>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  aria-label="Page mark reference actions"
                  loading={references.some((reference) => deletingId === reference.id)}
                >
                  <IconDotsVertical size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {references.map((reference) => {
                  const display = getReferenceDisplay(reference);

                  return (
                    <Menu.Item
                      key={reference.id}
                      closeMenuOnClick={false}
                      style={{ paddingRight: 8 }}
                      rightSection={
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          aria-label={`Delete ${display.label}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setPendingDelete(reference);
                          }}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      }
                    >
                      <Box style={{ minWidth: 0 }}>
                        <SymbolicLinkPreview
                          uri={display.uri}
                          label={display.label}
                          compact
                        />
                      </Box>
                    </Menu.Item>
                  );
                })}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>
      </Paper>

      <Modal
        opened={!!pendingDelete}
        onClose={() => {
          if (!deletingId) setPendingDelete(null);
        }}
        title="Delete mark reference"
        centered
        radius="md"
      >
        <Stack gap="md">
          <Text size="sm">
            Delete this mark reference for{" "}
            <strong>{pendingDelete && getReferenceDisplay(pendingDelete).label}</strong>
            ?
          </Text>
          <Text size="sm" c="dimmed">
            This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={!!deletingId}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={pendingDelete ? deletingId === pendingDelete.id : false}
              onClick={async () => {
                if (!pendingDelete || !onDelete) return;
                await onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
