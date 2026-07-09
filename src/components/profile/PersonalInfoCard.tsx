import {
  Avatar,
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconCheck,
  IconEdit,
  IconMail,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { getInitials } from "@/hooks/profileUtils";
import { ProfileAlerts } from "@/components/profile/ProfileAlerts";

type PersonalInfoCardProps = {
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  title: string;
  titleOrder: 2 | 3;
  isEditing: boolean;
  firstName: string;
  lastName: string;
  isSaving: boolean;
  error: string | null;
  success: string | null;
  onClearError: () => void;
  onClearSuccess: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
};

export function PersonalInfoCard({
  user,
  title,
  titleOrder,
  isEditing,
  firstName,
  lastName,
  isSaving,
  error,
  success,
  onClearError,
  onClearSuccess,
  onEdit,
  onCancel,
  onSave,
  onFirstNameChange,
  onLastNameChange,
}: PersonalInfoCardProps) {
  return (
    <Paper shadow="sm" p="xl" withBorder>
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={titleOrder}>{title}</Title>
          {!isEditing && (
            <Button
              leftSection={<IconEdit size={16} />}
              onClick={onEdit}
              variant="light"
            >
              Edit Profile
            </Button>
          )}
        </Group>

        <Divider />

        <Group>
          <Avatar size="xl" radius="xl" color="blue">
            {getInitials(user.email)}
          </Avatar>
          <Stack gap="xs">
            <Text size="xl" fw={600}>
              {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : "User"}
            </Text>
            <Group gap="xs">
              <IconMail size={16} />
              <Text size="sm" c="dimmed">
                {user.email}
              </Text>
            </Group>
          </Stack>
        </Group>

        <Divider />

        <ProfileAlerts
          error={error}
          success={success}
          onClearError={onClearError}
          onClearSuccess={onClearSuccess}
        />

        {isEditing ? (
          <Stack gap="md">
            <TextInput
              label="First Name"
              placeholder="John"
              value={firstName}
              onChange={(e) => onFirstNameChange(e.target.value)}
              required
              leftSection={<IconUser size={16} />}
            />

            <TextInput
              label="Last Name"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => onLastNameChange(e.target.value)}
              required
              leftSection={<IconUser size={16} />}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={onCancel}
                leftSection={<IconX size={16} />}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={onSave}
                loading={isSaving}
                leftSection={<IconCheck size={16} />}
              >
                Save Changes
              </Button>
            </Group>
          </Stack>
        ) : (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <Group gap="xs">
                  <IconUser size={18} />
                  <Text size="sm" c="dimmed">
                    First Name
                  </Text>
                </Group>
                <Text fw={500}>
                  {user.firstName || (
                    <Text component="span" c="dimmed" fs="italic">
                      Not set
                    </Text>
                  )}
                </Text>
              </Group>
            </Paper>

            <Paper p="md" withBorder>
              <Group justify="space-between">
                <Group gap="xs">
                  <IconUser size={18} />
                  <Text size="sm" c="dimmed">
                    Last Name
                  </Text>
                </Group>
                <Text fw={500}>
                  {user.lastName || (
                    <Text component="span" c="dimmed" fs="italic">
                      Not set
                    </Text>
                  )}
                </Text>
              </Group>
            </Paper>

            <Paper p="md" withBorder>
              <Group justify="space-between">
                <Group gap="xs">
                  <IconMail size={18} />
                  <Text size="sm" c="dimmed">
                    Email Address
                  </Text>
                </Group>
                <Text fw={500}>{user.email}</Text>
              </Group>
            </Paper>

            <Paper p="md" withBorder>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Account Status
                </Text>
                <Badge color="green" variant="light">
                  Active
                </Badge>
              </Group>
            </Paper>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
