import { currentUser } from "@/server/auth/currentUser";
import { updateProfile } from "@/serverFns/updateProfile.server";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Container,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconEdit,
  IconMail,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/profile/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userData, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isLoading && !userData?.loggedIn) {
    navigate({ to: "/login", search: { target: "/profile" } });
    return null;
  }

  const user = userData?.user;

  const handleEditClick = () => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setIsEditing(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }

    if (!lastName.trim()) {
      setError("Last name is required");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateProfile({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        },
      });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        setIsEditing(false);
        setSuccess("Profile updated successfully!");
      } else {
        setError(result.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <Container size="sm" mt="xl">
        <Paper shadow="sm" p="xl" withBorder>
          <Stack align="center">
            <Text>Loading...</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="sm" mt="xl">
      <Paper shadow="sm" p="xl" withBorder>
        <Stack gap="lg">
          <Group justify="space-between">
            <Title order={2}>Profile</Title>
            {!isEditing && (
              <Button
                leftSection={<IconEdit size={16} />}
                onClick={handleEditClick}
                variant="light"
              >
                Edit Profile
              </Button>
            )}
          </Group>

          <Divider />

          <Group>
            <Avatar size="xl" radius="xl" color="blue">
              {user?.email ? getInitials(user.email) : "U"}
            </Avatar>
            <Stack gap="xs">
              <Text size="xl" fw={600}>
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : "User"}
              </Text>
              <Group gap="xs">
                <IconMail size={16} />
                <Text size="sm" c="dimmed">
                  {user?.email}
                </Text>
              </Group>
            </Stack>
          </Group>

          <Divider />

          {success && (
            <Alert
              icon={<IconCheck size={16} />}
              title="Success"
              color="green"
              onClose={() => setSuccess(null)}
              withCloseButton
            >
              {success}
            </Alert>
          )}

          {error && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Error"
              color="red"
              onClose={() => setError(null)}
              withCloseButton
            >
              {error}
            </Alert>
          )}

          {isEditing ? (
            <Stack gap="md">
              <TextInput
                label="First Name"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                leftSection={<IconUser size={16} />}
              />

              <TextInput
                label="Last Name"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                leftSection={<IconUser size={16} />}
              />

              <Group justify="flex-end" mt="md">
                <Button
                  variant="subtle"
                  onClick={handleCancelEdit}
                  leftSection={<IconX size={16} />}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
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
                    {user?.firstName || (
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
                    {user?.lastName || (
                      <Text c="dimmed" fs="italic">
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
                  <Text fw={500}>{user?.email}</Text>
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

      <Paper shadow="sm" p="xl" withBorder mt="md">
        <Stack gap="md">
          <Title order={3}>Account Information</Title>
          <Divider />

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              User ID
            </Text>
            <Text size="sm" fw={500} style={{ fontFamily: "monospace" }}>
              {user?.id || "N/A"}
            </Text>
          </Group>

          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Authentication Method
            </Text>
            <Badge variant="light">Email & Password</Badge>
          </Group>
        </Stack>
      </Paper>
    </Container>
  );
}
