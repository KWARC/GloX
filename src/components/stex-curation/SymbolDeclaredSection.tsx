import { Badge, Group, Text } from "@mantine/core";

export type SymbolDeclaredSectionProps = {
  data: {
    symbols: string[];
  };
};

export function SymbolDeclaredSection({ data }: SymbolDeclaredSectionProps) {
  const symbols = Array.from(new Set(data.symbols));

  return (
    <>
      {symbols.length > 0 ? (
        <Group gap={4} wrap="wrap">
          {symbols.map((symbol) => (
            <Badge
              key={symbol}
              size="xs"
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
    </>
  );
}
