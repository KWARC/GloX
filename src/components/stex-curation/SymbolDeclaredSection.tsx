import { Badge, Group, Stack, Text } from "@mantine/core";

export type SymbolDeclaredSectionProps = {
  data: {
    actualSymbols: string[];
  };
};

export function SymbolDeclaredSection({ data }: SymbolDeclaredSectionProps) {
  const [firstSymbol, ...remainingSymbols] = data.actualSymbols;

  return (
    <Stack gap={6} align="flex-start">
      {firstSymbol ? (
        <Group gap={6} wrap="nowrap">
          <Text size="sm" fw={500}>
            {firstSymbol}
          </Text>
          {remainingSymbols.length > 0 && (
            <Badge
              size="sm"
              variant="light"
              color="gray"
              radius="sm"
              style={{ textTransform: "none" }}
            >
              +{remainingSymbols.length}
            </Badge>
          )}
        </Group>
      ) : (
        <Text size="xs" c="dimmed" fs="italic">
          No symbol declared
        </Text>
      )}
    </Stack>
  );
}
