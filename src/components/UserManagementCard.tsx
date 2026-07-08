import type {
  AdminProfileUser,
  UserRoleValue,
} from "@/serverFns/adminUsers.server";
import {
  Alert,
  Badge,
  Divider,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { getDisplayName } from "../hooks/profileUtils";
import { ProfileAlerts } from "./ProfileAlerts";

type UserManagementCardProps = {
  users: AdminProfileUser[];
  isLoading: boolean;
  hasLoadError: boolean;
  isUpdatingRole: boolean;
  pendingRoleByUserId: Record<string, UserRoleValue>;
  roleOptions: Array<{ value: UserRoleValue; label: string }>;
  error: string | null;
  success: string | null;
  onClearError: () => void;
  onClearSuccess: () => void;
  onRoleSelection: (user: AdminProfileUser, value: string | null) => void;
};

export function UserManagementCard({
  users,
  isLoading,
  hasLoadError,
  isUpdatingRole,
  pendingRoleByUserId,
  roleOptions,
  error,
  success,
  onClearError,
  onClearSuccess,
  onRoleSelection,
}: UserManagementCardProps) {
  return (
    <Paper shadow="sm" p="xl" withBorder>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={3}>Manage Users</Title>
            <Text size="sm" c="dimmed">
              Manage roles and user data for other users.
            </Text>
          </div>
        </Group>

        <Divider />

        <ProfileAlerts
          error={error}
          success={success}
          onClearError={onClearError}
          onClearSuccess={onClearSuccess}
        />

        {isLoading ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : hasLoadError ? (
          <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
            Failed to load users.
          </Alert>
        ) : users.length === 0 ? (
          <Text size="sm" c="dimmed">
            No other users found.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={720}>
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Current Role</Table.Th>
                  <Table.Th>New Role</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>{getDisplayName(user)}</Table.Td>
                    <Table.Td>{user.email}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{user.role}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Select
                        data={roleOptions}
                        value={pendingRoleByUserId[user.id] ?? user.role}
                        onChange={(value) => onRoleSelection(user, value)}
                        allowDeselect={false}
                        disabled={isUpdatingRole}
                        size="sm"
                        w={160}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
    </Paper>
  );
}
