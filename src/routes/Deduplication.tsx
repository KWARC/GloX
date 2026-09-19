import { Duplicate } from "@/components/Duplicate";
import { DeduplicationPageSkeleton } from "@/components/PageSkeletons";
import {
  CONFIRMED_NOT_DUPLICATE_SECTION_TITLE,
  partitionDedupCatalog,
} from "@/lib/dedupCatalogDisplay";
import { getAllSymbols } from "@/serverFns/symbol.server";
import { Box, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/Deduplication")({
  component: DeduplicationPage,
});

function groupBySymbolName(
  symbols: NonNullable<Awaited<ReturnType<typeof getAllSymbols>>>,
) {
  const grouped: Record<string, typeof symbols> = {};
  for (const symbol of symbols) {
    if (!grouped[symbol.symbolName]) grouped[symbol.symbolName] = [];
    grouped[symbol.symbolName].push(symbol);
  }
  return Object.entries(grouped);
}

function DeduplicationPage() {
  const { data: symbols = [], isLoading } = useQuery({
    queryKey: ["dedup-symbols"],
    queryFn: () => getAllSymbols(),
  });

  if (isLoading) return <DeduplicationPageSkeleton />;

  const { unconfirmed, confirmed } = partitionDedupCatalog(symbols);
  const unconfirmedGroups = groupBySymbolName(unconfirmed);
  const confirmedGroups = groupBySymbolName(confirmed);

  return (
    <Box p="lg">
      <Title mb="md">Deduplication</Title>

      {unconfirmedGroups.length === 0 && confirmedGroups.length === 0 && (
        <Text c="dimmed">No duplicate symbols found</Text>
      )}

      <Stack>
        {unconfirmedGroups.map(([symbolName]) => (
          <Duplicate key={symbolName} symbolName={symbolName} />
        ))}
      </Stack>

      {confirmedGroups.length > 0 && (
        <Stack mt="xl">
          <Title order={3}>{CONFIRMED_NOT_DUPLICATE_SECTION_TITLE}</Title>
          {confirmedGroups.map(([symbolName]) => (
            <Duplicate key={`confirmed-${symbolName}`} symbolName={symbolName} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
