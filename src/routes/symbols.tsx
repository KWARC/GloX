import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import {
  deleteSymbolIfUnassociated,
  listSymbolsWithAssociations,
  type SymbolAssociationSummary,
} from "@/serverFns/symbol.server";
import { ExtractedItem } from "@/server/text-selection";
import { adminUser } from "@/server/auth/isAdmin.server";
import {
  ActionIcon,
  Box,
  Loader,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/symbols")({
  loader: async () => {
    const user = await adminUser();

    if (!user.loggedIn) {
      throw redirect({ to: "/" });
    }

    const role = user.user?.role;
    if (role !== "ADMIN" && role !== "CURATOR") {
      throw redirect({ to: "/" });
    }

    return null;
  },
  component: SymbolsPage,
});

function SymbolsPage() {
  const queryClient = useQueryClient();
  const { data: symbols = [], isLoading } = useQuery<SymbolAssociationSummary[]>({
    queryKey: ["symbols-with-associations"],
    queryFn: () => listSymbolsWithAssociations(),
  });

  const { mutateAsync: deleteSymbol, isPending: isDeleting } = useMutation({
    mutationFn: (symbolId: string) =>
      deleteSymbolIfUnassociated({ data: { symbolId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["symbols-with-associations"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["dedup-symbols"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["symbol-search-db"],
      });
    },
  });

  async function handleDelete(symbol: SymbolAssociationSummary) {
    if (!symbol.canDelete) return;
    if (!confirm(`Delete symbol "${symbol.symbolName}"?`)) return;

    try {
      await deleteSymbol(symbol.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete symbol";
      alert(message);
    }
  }

  if (isLoading) {
    return (
      <Stack align="center" p="xl">
        <Loader />
      </Stack>
    );
  }

  const noop = () => {};
  const noopAsync = async () => {};

  return (
    <Box p="lg">
      <Stack gap="md">
        <Box>
          <Title order={2}>Symbols</Title>
          <Text size="sm" c="dimmed">
            Review local DB symbols.
          </Text>
        </Box>

        {symbols.length === 0 ? (
          <Text c="dimmed">No local symbols found</Text>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table
              withTableBorder
              striped
              highlightOnHover
              verticalSpacing="sm"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Symbol Name</Table.Th>
                  <Table.Th>Verbalization</Table.Th>
                  <Table.Th>Associated Definitions</Table.Th>
                  <Table.Th ta="center">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {symbols.map((symbol) => (
                  <Table.Tr key={symbol.id}>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text fw={600}>{symbol.symbolName}</Text>
                        <Text size="xs" ff="monospace" c="dimmed">
                          [{symbol.futureRepo}] [{symbol.filePath}] [{symbol.fileName}] [{symbol.language}]
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={symbol.alias ? undefined : "dimmed"}>
                        {symbol.alias || "No verbalization"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {symbol.associatedDefinitions.length > 0 ? (
                        <ExtractedTextPanel
                          compact
                          extracts={symbol.associatedDefinitions as ExtractedItem[]}
                          editingId={null}
                          selectedId={null}
                          onToggleEdit={noop}
                          onUpdate={noopAsync}
                          onDelete={noop}
                          onSelection={noop}
                          onOpenSemanticPanel={noop}
                          showPageNumber={false}
                          showDefinitionMeta={false}
                          showActions={false}
                          isLocked
                        />
                      ) : (
                        <Text size="sm" c="dimmed">
                          No Associated Definition
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="center">
                      {symbol.canDelete ? (
                        <Tooltip label="Delete unassociated symbol" withArrow>
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            loading={isDeleting}
                            onClick={() => {
                              void handleDelete(symbol);
                            }}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      ) : (
                        <Text size="xs" c="dimmed">
                          In use
                        </Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
    </Box>
  );
}
