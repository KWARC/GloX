import {
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

export type ConfirmDialogKind = "confirm" | "undo";

type ConfirmationModalProps = {
  kind: ConfirmDialogKind;
  symbolName: string;
  opened: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmationModal({
  kind,
  symbolName,
  opened,
  loading,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const isConfirm = kind === "confirm";

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={
        <Group gap="xs">
          <ThemeIcon
            size="sm"
            radius="xl"
            color={isConfirm ? "blue" : "orange"}
            variant="light"
          >
            <IconInfoCircle size={14} />
          </ThemeIcon>
          <Text fw={700} size="sm">
            {isConfirm ? "Confirm Action" : "Undo Confirmation"}
          </Text>
        </Group>
      }
      centered
      size="sm"
      padding="lg"
      radius="md"
    >
      <Stack gap="md">
        {isConfirm ? (
          <Stack gap="xs">
            <Text size="sm">
              You are marking{" "}
              <Text span fw={700} ff="monospace">
                {symbolName}
              </Text>{" "}
              as{" "}
              <Text span fw={700}>
                NOT a duplicate
              </Text>
              .
            </Text>
            <Paper
              p="sm"
              radius="md"
              bg="blue.0"
              withBorder
              style={{ borderColor: "var(--mantine-color-blue-3)" }}
            >
              <Text size="sm" c="blue.8">
                This means you have verified that it does not exist on MathHub.
              </Text>
            </Paper>
            <Text size="sm" c="dimmed">
              Do you want to proceed?
            </Text>
          </Stack>
        ) : (
          <Stack gap="xs">
            <Text size="sm">
              This symbol was previously confirmed as{" "}
              <Text span fw={700}>
                NOT a duplicate
              </Text>
              .
            </Text>
            <Paper
              p="sm"
              radius="md"
              bg="orange.0"
              withBorder
              style={{ borderColor: "var(--mantine-color-orange-3)" }}
            >
              <Text size="sm" c="orange.8">
                Undoing this will remove the confirmation and attribution.
              </Text>
            </Paper>
            <Text size="sm" c="dimmed">
              Do you want to undo this decision?
            </Text>
          </Stack>
        )}

        <Group justify="flex-end" gap="sm" mt="xs">
          <Button
            variant="default"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            color={isConfirm ? "blue" : "orange"}
            loading={loading}
            onClick={onConfirm}
          >
            {isConfirm ? "Confirm" : "Undo"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
