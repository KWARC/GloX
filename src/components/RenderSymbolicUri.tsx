import { Group, Text } from "@mantine/core";
import {
  IconBook,
  IconSchool,
  IconArchive,
} from "@tabler/icons-react";

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

    const RightIcon = symbol ? IconSchool : IconBook;
    const RightLabel = symbol ?? definiens;

    return (
      <Group justify="space-between" wrap="nowrap" w="100%">
        <Group gap={4} wrap="nowrap">
          <IconArchive size={14} stroke={1.6} />
          <Text size="xs" c="dimmed">
            {archive}
          </Text>
        </Group>

        {RightLabel && (
          <Group gap={4} wrap="nowrap">
            <RightIcon size={14} stroke={1.8} />
            <Text size="xs" fw={500}>
              {RightLabel}
            </Text>
          </Group>
        )}
      </Group>
    );
  } catch {
    return <Text size="xs">{uri}</Text>;
  }
}
