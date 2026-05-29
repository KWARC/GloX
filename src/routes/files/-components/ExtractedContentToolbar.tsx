import { ActionIcon, Badge, Button, Group, Text, Tooltip } from "@mantine/core";
import { IconList, IconPlus } from "@tabler/icons-react";

export function ExtractedContentToolbar({
  extractCount,
  onOpenLatexConfig,
  onCreateDefinition,
}: {
  extractCount: number;
  onOpenLatexConfig: () => void;
  onCreateDefinition: () => void;
}) {
  return (
    <Group
      px="md"
      py="sm"
      gap="xs"
      style={{
        borderBottom: "1px solid var(--mantine-color-gray-2)",
      }}
    >
      <IconList size={16} color="var(--mantine-color-teal-6)" />

      <Text size="sm" fw={600} c="gray.7">
        Extracted Content
      </Text>

      {extractCount > 0 && (
        <Badge size="xs" variant="filled" color="teal" ml="auto">
          {extractCount}
        </Badge>
      )}

      <Button
        size="xs"
        variant="subtle"
        color="blue"
        onClick={onOpenLatexConfig}
      >
        LaTeX
      </Button>

      <Tooltip label="Create new definition" withArrow>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="teal"
          onClick={onCreateDefinition}
        >
          <IconPlus size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
