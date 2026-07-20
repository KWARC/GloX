import { ActionIcon, Badge, Button, Group, Text, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconList, IconPlus } from "@tabler/icons-react";

export function ExtractedContentToolbar({
  extractCount,
  onOpenLatexConfig,
  onCreateDefinition,
  showLatexButton = true,
}: {
  extractCount: number;
  onOpenLatexConfig: () => void;
  onCreateDefinition: () => void;
  showLatexButton?: boolean;
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <Group
      px={isMobile ? "lg" : "md"}
      py={isMobile ? "md" : "sm"}
      gap="xs"
      style={{
        borderBottom: "1px solid var(--mantine-color-gray-2)",
      }}
    >
      <IconList size={isMobile ? 18 : 16} color="var(--mantine-color-teal-6)" />

      <Text size={isMobile ? "md" : "sm"} fw={600} c="gray.7">
        Extracted Content
      </Text>

      {extractCount > 0 && (
        <Badge size={isMobile ? "sm" : "xs"} variant="filled" color="teal" ml="auto">
          {extractCount}
        </Badge>
      )}

      {showLatexButton && (
        <Button
          size={isMobile ? "sm" : "xs"}
          variant="subtle"
          color="blue"
          onClick={onOpenLatexConfig}
        >
          LaTeX
        </Button>
      )}

      <Tooltip label="Create new content" withArrow>
        <ActionIcon
          size={isMobile ? "md" : "sm"}
          variant="subtle"
          color="teal"
          onClick={onCreateDefinition}
        >
          <IconPlus size={isMobile ? 18 : 16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
