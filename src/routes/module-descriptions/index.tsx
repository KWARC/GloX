import {
  listModuleDescriptions,
  listModuleDescriptionsForTexExport,
  searchModuleDescriptions,
} from "@/serverFns/moduleDescription.server";
import {
  generateAllModuleDescriptionTexFiles,
  ModuleDescriptionTexBulkExportError,
} from "@/lib/moduleDescriptionTexExport";
import {
  downloadTexFilesAsZip,
  MODULE_DESCRIPTIONS_TEX_ZIP_FILE_NAME,
} from "@/lib/texZipExport";
import { ModuleDuplicateHint, ModuleIdWithDuplicateIcon } from "@/components/module-descriptions/ModuleDuplicateHint";
import {
  INDEX_STATUS_CONFIG,
  INDEX_STATUS_OPTIONS,
  IndexStatus,
} from "@/types/indexStatus";
import {
  Alert,
  Badge,
  Box,
  Button,
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { currentUser } from "@/server/auth/currentUser";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

const LIST_PAGE_SIZE = 20;

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
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportPartialSuccess, setExportPartialSuccess] = useState(false);

  const [listPage, setListPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<IndexStatus | null>(null);
  const [listQuery, setListQuery] = useState("");
  const [debouncedListQuery, setDebouncedListQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedListQuery(listQuery), 300);
    return () => clearTimeout(timer);
  }, [listQuery]);

  useEffect(() => {
    setListPage(1);
  }, [statusFilter, debouncedListQuery]);

  const { data: auth } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
  });
  const role = auth?.user?.role;
  const canExportTex = role === "ADMIN" || role === "CURATOR";

  const exportAllMutation = useMutation({
    mutationFn: async () => {
      const modules = await listModuleDescriptionsForTexExport();
      if (modules.length === 0) {
        throw new Error("No module descriptions to export");
      }
      const { files, failures } = await generateAllModuleDescriptionTexFiles(modules);
      if (files.length > 0) {
        downloadTexFilesAsZip(files, MODULE_DESCRIPTIONS_TEX_ZIP_FILE_NAME);
      }
      if (failures.length > 0) {
        throw new ModuleDescriptionTexBulkExportError(failures, files.length);
      }
    },
    onMutate: () => {
      setExportError(null);
      setExportPartialSuccess(false);
    },
    onError: (error) => {
      setExportError(error instanceof Error ? error.message : String(error));
      setExportPartialSuccess(
        error instanceof ModuleDescriptionTexBulkExportError && error.partialSuccess,
      );
    },
  });

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["module-descriptions-search", debouncedQuery],
    queryFn: () =>
      searchModuleDescriptions({ data: { query: debouncedQuery } }),
    enabled: debouncedQuery.trim().length > 0,
  });

  const {
    data: listData,
    isLoading: listLoading,
    isFetching: listFetching,
  } = useQuery({
    queryKey: [
      "module-descriptions-list",
      listPage,
      statusFilter,
      debouncedListQuery,
    ],
    queryFn: () =>
      listModuleDescriptions({
        data: {
          page: listPage,
          pageSize: LIST_PAGE_SIZE,
          status: statusFilter,
          query: debouncedListQuery || undefined,
        },
      }),
  });

  const listItems = listData?.items ?? [];
  const listTotal = listData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(listTotal / LIST_PAGE_SIZE));

  return (
    <Stack p="md" gap="lg" maw={1200} mx="auto" w="100%">
      <Box>
        <Title order={2}>Module descriptions</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Search the catalog or browse modules with curation in progress.
        </Text>
      </Box>

      <Stack gap="sm">
        <Title order={4}>Catalog search</Title>
        <Text size="sm" c="dimmed">
          Find a module by ID or title.
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
              {results.map((row) => {
                const organizationLabel = [row.faculty, row.subjectArea]
                  .filter(Boolean)
                  .join(" — ");
                return (
                  <Table.Tr key={row.moduleId}>
                    <Table.Td>
                      <ModuleIdWithDuplicateIcon
                        moduleId={row.moduleId}
                        duplicateOfModuleId={row.duplicateOfModuleId}
                        extracted={row.extracted}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm">{row.title}</Text>
                        {organizationLabel ? (
                          <Text size="xs" c="dimmed">
                            {organizationLabel}
                          </Text>
                        ) : null}
                        {row.duplicateHint ? (
                          <ModuleDuplicateHint
                            exact={row.duplicateHint.exact}
                            near={row.duplicateHint.near}
                          />
                        ) : null}
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Stack gap={4}>
            <Title order={4}>Modules</Title>
            <Text size="sm" c="dimmed">
              Modules with curation in progress or completed
            </Text>
          </Stack>

          <Group align="flex-end" gap="sm" wrap="wrap">
            {canExportTex && (
              <Button
                variant="light"
                size="compact-sm"
                leftSection={<Download size={14} />}
                loading={exportAllMutation.isPending}
                onClick={() => exportAllMutation.mutate()}
              >
                Download all
              </Button>
            )}
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
        </Group>

        {exportError && (
          <Alert
            color={exportPartialSuccess ? "yellow" : "red"}
            title={
              exportPartialSuccess
                ? "LaTeX export completed with failures"
                : "LaTeX export failed"
            }
          >
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {exportError}
            </Text>
          </Alert>
        )}

        <TextInput
          placeholder="Filter by module ID"
          value={listQuery}
          onChange={(e) => setListQuery(e.currentTarget.value)}
        />

        {listLoading ? (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        ) : listItems.length === 0 ? (
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
              No modules found
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
                  {listItems.map((row) => {
                    const statusConf = INDEX_STATUS_CONFIG[row.indexStatus];
                    const organizationLabel = [row.faculty, row.subjectArea]
                      .filter(Boolean)
                      .join(" — ");
                    return (
                      <Table.Tr key={row.id}>
                        <Table.Td>
                          <ModuleIdWithDuplicateIcon
                            moduleId={row.moduleId}
                            duplicateOfModuleId={row.duplicateOfModuleId}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text size="sm">{row.title}</Text>
                            {organizationLabel ? (
                              <Text size="xs" c="dimmed">
                                {organizationLabel}
                              </Text>
                            ) : null}
                          </Stack>
                        </Table.Td>
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
                {listTotal} module{listTotal === 1 ? "" : "s"}
                {listFetching && !listLoading ? " (updating…)" : ""}
              </Text>
              <Pagination
                value={listPage}
                onChange={setListPage}
                total={totalPages}
              />
            </Group>
          </>
        )}
      </Stack>
    </Stack>
  );
}
