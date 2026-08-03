import {
  listGloxifiedModuleDescriptions,
  searchModuleDescriptions,
} from "@/serverFns/moduleDescription.server";
import {
  INDEX_STATUS_CONFIG,
  INDEX_STATUS_OPTIONS,
  IndexStatus,
} from "@/types/indexStatus";
import {
  Badge,
  Box,
  Divider,
  Group,
  Loader,
  Pagination,
  Select,
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

const GLOXIFIED_PAGE_SIZE = 20;

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

  const [gloxifiedPage, setGloxifiedPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<IndexStatus | null>(null);
  const [gloxifiedQuery, setGloxifiedQuery] = useState("");
  const [debouncedGloxifiedQuery, setDebouncedGloxifiedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedGloxifiedQuery(gloxifiedQuery), 300);
    return () => clearTimeout(timer);
  }, [gloxifiedQuery]);

  useEffect(() => {
    setGloxifiedPage(1);
  }, [statusFilter, debouncedGloxifiedQuery]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["module-descriptions-search", debouncedQuery],
    queryFn: () =>
      searchModuleDescriptions({ data: { query: debouncedQuery } }),
    enabled: debouncedQuery.trim().length > 0,
  });

  const {
    data: gloxifiedData,
    isLoading: gloxifiedLoading,
    isFetching: gloxifiedFetching,
  } = useQuery({
    queryKey: [
      "gloxified-module-descriptions",
      gloxifiedPage,
      statusFilter,
      debouncedGloxifiedQuery,
    ],
    queryFn: () =>
      listGloxifiedModuleDescriptions({
        data: {
          page: gloxifiedPage,
          pageSize: GLOXIFIED_PAGE_SIZE,
          status: statusFilter,
          query: debouncedGloxifiedQuery || undefined,
        },
      }),
  });

  const gloxifiedItems = gloxifiedData?.items ?? [];
  const gloxifiedTotal = gloxifiedData?.total ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(gloxifiedTotal / GLOXIFIED_PAGE_SIZE),
  );

  return (
    <Stack p="md" gap="lg" maw={1200} mx="auto" w="100%">
      <Box>
        <Title order={2}>Module descriptions</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Search the catalog or browse gloxified modules.
        </Text>
      </Box>

      <Stack gap="sm">
        <Title order={4}>Catalog search</Title>
        <Text size="sm" c="dimmed">
          Find a module by ID or title (including modules not yet gloxified).
        </Text>
        <TextInput
          placeholder="e.g. 33994 or Logopädie"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
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

      <Divider />

      <Stack gap="sm">
        <Group justify="space-between" align="flex-end">
          <Stack gap={4}>
            <Title order={4}>Gloxified modules</Title>
            <Text size="sm" c="dimmed">
              Modules with curation in progress or completed
            </Text>
          </Stack>

          <Select
            label="Filter by status"
            placeholder="All statuses"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as IndexStatus | null)}
            clearable
            data={INDEX_STATUS_OPTIONS}
            w={220}
            size="sm"
            styles={{
              label: { fontWeight: 500, marginBottom: 4 },
            }}
          />
        </Group>

        <TextInput
          placeholder="Filter by module ID"
          value={gloxifiedQuery}
          onChange={(e) => setGloxifiedQuery(e.currentTarget.value)}
        />

        {gloxifiedLoading ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : gloxifiedItems.length === 0 ? (
          <Box
            py="lg"
            style={{
              textAlign: "center",
              borderRadius: 8,
              border: "1px dashed var(--mantine-color-gray-3)",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            <Text size="sm" c="dimmed" fw={500}>
              No gloxified modules found
            </Text>
          </Box>
        ) : (
          <>
            <Table.ScrollContainer minWidth={720}>
              <Table
                highlightOnHover
                withTableBorder
                verticalSpacing="xs"
                horizontalSpacing="sm"
                styles={{
                  th: {
                    paddingTop: 10,
                    paddingBottom: 10,
                    fontSize: "0.75rem",
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                  },
                  td: {
                    paddingTop: 10,
                    paddingBottom: 10,
                    verticalAlign: "middle",
                  },
                }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w="12%">ID</Table.Th>
                    <Table.Th w="44%">Title</Table.Th>
                    <Table.Th w="10%">Lang</Table.Th>
                    <Table.Th w="18%">Status</Table.Th>
                    <Table.Th w="16%">Updated</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {gloxifiedItems.map((row) => {
                    const statusConf = INDEX_STATUS_CONFIG[row.indexStatus];
                    return (
                      <Table.Tr key={row.id}>
                        <Table.Td>
                          <Link
                            to="/module-description/$moduleId"
                            params={{ moduleId: row.moduleId }}
                          >
                            {row.moduleId}
                          </Link>
                        </Table.Td>
                        <Table.Td>{row.title}</Table.Td>
                        <Table.Td>{row.language}</Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            variant="light"
                            color={statusConf.color}
                          >
                            {statusConf.label}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {new Date(row.updatedAt).toLocaleDateString()}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                {gloxifiedTotal} module{gloxifiedTotal === 1 ? "" : "s"}
                {gloxifiedFetching && !gloxifiedLoading ? " (updating…)" : ""}
              </Text>
              <Pagination
                value={gloxifiedPage}
                onChange={setGloxifiedPage}
                total={totalPages}
              />
            </Group>
          </>
        )}
      </Stack>
    </Stack>
  );
}
