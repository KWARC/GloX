import { getDisplayName } from "@/hooks/profileUtils";
import type {
  AdminProfileUser,
  UserRoleValue,
} from "@/serverFns/adminUsers.server";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

type RoleChangeConfirmationModalProps = {
  target: {
    user: AdminProfileUser;
    nextRole: UserRoleValue;
  } | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RoleChangeConfirmationModal({
  target,
  loading,
  onCancel,
  onConfirm,
}: RoleChangeConfirmationModalProps) {
  return (
    <Modal
      opened={!!target}
      onClose={onCancel}
      title={
        <Group gap="xs">
          <IconInfoCircle size={16} />
          <Text fw={700} size="sm">
            Confirm Role Change
          </Text>
        </Group>
      }
      centered
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm">
          Change{" "}
          <Text span fw={700}>
            {target ? getDisplayName(target.user) : ""}
          </Text>{" "}
          from{" "}
          <Text span fw={700}>
            {target?.user.role ?? ""}
          </Text>{" "}
          to{" "}
          <Text span fw={700}>
            {target?.nextRole ?? ""}
          </Text>
          ?
        </Text>

        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            Confirm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
