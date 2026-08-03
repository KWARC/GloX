import { searchModuleDescriptions } from "@/serverFns/moduleDescription.server";
import {
  Box,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { currentUser } from "@/server/auth/currentUser";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/module-descriptions/")({
  loader: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) {
      throw redirect({ to: "/login" });
    }
    const role = user.user?.role;
    if (role !== "ADMIN" && role !== "CURATOR" && role !== "EXTRACTOR") {
      throw redirect({ to: "/" });
    }
    return null;
  },
  component: ModuleDescriptionsPage,
});

function ModuleDescriptionsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["module-descriptions-search", debouncedQuery],
    queryFn: () =>
      searchModuleDescriptions({ data: { query: debouncedQuery } }),
    enabled: debouncedQuery.trim().length > 0,
  });

  return (
    <Stack p="md" gap="md" maw={1000} mx="auto" w="100%">
      <Box>
        <Title order={2}>Module descriptions</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Search by module ID or title.
        </Text>
      </Box>

      <TextInput
        placeholder="e.g. 33994 or Logopädie"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        autoFocus
      />

      {isFetching && (
        <Group justify="center">
          <Loader size="sm" />
        </Group>
      )}

      {debouncedQuery.trim() && !isFetching && results.length === 0 && (
        <Text size="sm" c="dimmed">
          No modules found.
        </Text>
      )}

      {results.length > 0 && (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Title</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {results.map((row) => (
              <Table.Tr key={row.moduleId}>
                <Table.Td>
                  <Link
                    to="/module-description/$moduleId"
                    params={{ moduleId: row.moduleId }}
                  >
                    {row.moduleId}
                  </Link>
                </Table.Td>
                <Table.Td>{row.title}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Stack>
  );
}
