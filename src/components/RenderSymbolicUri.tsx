import { Group, Text } from "@mantine/core";
import { IconBook, IconSchool } from "@tabler/icons-react";

export function RenderSymbolicUri({ uri }: { uri: string }) {
  try {
    const url = new URL(uri);
    const params = url.searchParams;

    const archive = params.get("a");
    const symbol = params.get("s");
    const definiens = params.get("d");

    if (!archive) {
      return <Text size="xs">{uri}</Text>;
    }

    if (symbol) {
      return (
        <Group gap={6} wrap="nowrap">
          <IconSchool size={14} stroke={1.8} />
          <Text size="xs" c="dimmed">
            {archive}
          </Text>
          <Text size="xs" fw={500}>
            {symbol}
          </Text>
        </Group>
      );
    }

    if (definiens) {
      return (
        <Group gap={6} wrap="nowrap">
          <IconBook size={14} stroke={1.8} />
          <Text size="xs" c="dimmed">
            {archive}
          </Text>
          <Text size="xs" fw={500}>
            {definiens}
          </Text>
        </Group>
      );
    }

    return <Text size="xs">{archive}</Text>;
  } catch {
    return <Text size="xs">{uri}</Text>;
  }
}
