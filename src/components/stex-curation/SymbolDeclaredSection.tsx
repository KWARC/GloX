import { ActionIcon, Badge, Box, Group, Text, Tooltip } from "@mantine/core";
import { Download } from "lucide-react";

export type SymbolDeclaredSectionProps = {
  data: {
    actualSymbols: string[];
  };
  actions: {
    onDownload: () => void;
  };
};

export function SymbolDeclaredSection({
  data,
  actions,
}: SymbolDeclaredSectionProps) {
  return (
    <Box
      px="md"
      py="sm"
      style={{
        borderBottom: "1px solid var(--mantine-color-gray-2)",
        backgroundColor: "var(--mantine-color-gray-0)",
      }}
    >
      <Group justify="space-between" align="center" mb={6}>
        <Text size="xs" fw={700} c="gray.6" tt="uppercase" lts={0.5}>
          Symbol Declared
        </Text>

        <Group gap={6}>
          <Tooltip label="Download .tex file" withArrow position="top">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={actions.onDownload}
            >
              <Download size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {data.actualSymbols.length > 0 ? (
        <Group gap={6} wrap="wrap">
          {data.actualSymbols.map((symbol) => (
            <Badge
              key={symbol}
              size="sm"
              variant="light"
              color="blue"
              radius="sm"
              style={{ textTransform: "none" }}
            >
              {symbol}
            </Badge>
          ))}
        </Group>
      ) : (
        <Text size="xs" c="dimmed" fs="italic">
          No symbol declared
        </Text>
      )}
    </Box>
  );
}
