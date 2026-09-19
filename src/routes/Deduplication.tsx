import { Duplicate } from "@/components/Duplicate";
import { DeduplicationPageSkeleton } from "@/components/PageSkeletons";
import {
  CONFIRMED_NOT_DUPLICATE_SECTION_TITLE,
  DEDUP_PAGE_SIZE,
  paginateDedupCatalog,
  partitionDedupCatalog,
} from "@/lib/dedupCatalogDisplay";
import { getAllSymbols } from "@/serverFns/symbol.server";
import { Box, Group, Pagination, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
  const [page, setPage] = useState(1);
  const { data: symbols = [], isLoading } = useQuery({
    queryKey: ["dedup-symbols"],
    queryFn: () => getAllSymbols(),
  });

  const { unconfirmed, confirmed } = partitionDedupCatalog(symbols);
  const unconfirmedGroups = groupBySymbolName(unconfirmed);
  const confirmedGroups = groupBySymbolName(confirmed);
  const catalogPage = paginateDedupCatalog(
    unconfirmedGroups,
    confirmedGroups,
    page,
    DEDUP_PAGE_SIZE,
  );

  useEffect(() => {
    if (page > catalogPage.totalPages) setPage(catalogPage.totalPages);
  }, [page, catalogPage.totalPages]);

  if (isLoading) return <DeduplicationPageSkeleton />;

  return (
    <Box p="lg">
      <Title mb="md">Deduplication</Title>

      {catalogPage.totalEntries === 0 && (
        <Text c="dimmed">No duplicate symbols found</Text>
      )}

      <Stack>
        {catalogPage.unconfirmed.map(([symbolName]) => (
          <Duplicate key={symbolName} symbolName={symbolName} />
        ))}
      </Stack>

      {catalogPage.confirmed.length > 0 && (
        <Stack mt="xl">
          <Title order={3}>{CONFIRMED_NOT_DUPLICATE_SECTION_TITLE}</Title>
          {catalogPage.confirmed.map(([symbolName]) => (
            <Duplicate key={`confirmed-${symbolName}`} symbolName={symbolName} />
          ))}
        </Stack>
      )}

      {catalogPage.totalEntries > DEDUP_PAGE_SIZE && (
        <Group justify="space-between" align="center" mt="xl">
          <Text size="sm" c="dimmed">
            {catalogPage.totalEntries} symbol
            {catalogPage.totalEntries === 1 ? "" : "s"}
          </Text>
          <Pagination
            value={Math.min(page, catalogPage.totalPages)}
            onChange={setPage}
            total={catalogPage.totalPages}
          />
        </Group>
      )}
    </Box>
  );
}
