import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack, Title, Text } from "@mantine/core";

import { getAllSymbols } from "@/serverFns/symbol.server";
import { Duplicate } from "@/components/Duplicate";

type SymbolType = {
  id: string;
  symbolName: string;
  alias?: string | null;
  futureRepo?: string;
  filePath?: string;
  fileName?: string;
  language?: string;
};

export const Route = createFileRoute("/Deduplication")({
  component: DeduplicationPage,
});

function DeduplicationPage() {
  const { data: symbols = [], isLoading } = useQuery<SymbolType[]>({
    queryKey: ["dedup-symbols"],
    queryFn: () => getAllSymbols(),
  });

  if (isLoading) return <div>Loading...</div>;

  const grouped: Record<string, SymbolType[]> = {};

  symbols.forEach((s) => {
    if (!grouped[s.symbolName]) {
      grouped[s.symbolName] = [];
    }
    grouped[s.symbolName].push(s);
  });

  const duplicates = Object.entries(grouped);

  return (
    <Box p="lg">
      <Title mb="md">Deduplication</Title>

      {duplicates.length === 0 && <Text c="dimmed">No duplicate symbols found</Text>}

      <Stack>
        {duplicates.map(([symbolName]) => (
          <Duplicate key={symbolName} symbolName={symbolName} />
        ))}
      </Stack>
    </Box>
  );
}
