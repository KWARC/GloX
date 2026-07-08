import {
  Badge,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";

type AccountInformationCardProps = {
  user: {
    id: string;
  };
};

export function AccountInformationCard({ user }: AccountInformationCardProps) {
  return (
    <Paper shadow="sm" p="xl" withBorder>
      <Stack gap="md">
        <Title order={3}>Account Information</Title>
        <Divider />

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            User ID
          </Text>
          <Text size="sm" fw={500} style={{ fontFamily: "monospace" }}>
            {user.id}
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
  );
}
