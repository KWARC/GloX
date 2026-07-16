import { MyDocument, myDocumentsQuery } from "@/queries/document";
import { UploadAttributionInfo } from "@/components/UploadAttributionInfo";
import { currentUser } from "@/server/auth/currentUser";
import {
  checkDocumentDefinitions,
  deleteDocument,
} from "@/serverFns/deleteDocument.server";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconFileDescription,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";

type DocumentsTableProps = {
  title?: string;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function matchesSearch(doc: MyDocument, searchValue: string) {
  if (!searchValue) return true;

  const haystack = [
    doc.filename,
    doc.futureRepo,
    doc.filePath,
    doc.language,
  ].join(" ");

  return haystack.toLowerCase().includes(searchValue);
}

export function DocumentsTable({
  title = "Uploaded Files",
}: DocumentsTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery<MyDocument[]>(myDocumentsQuery);
  const { data: auth } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
    staleTime: 60_000,
  });

  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(
    searchValue.trim().toLowerCase(),
  );
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");
  const [moduleDescriptionFilter, setModuleDescriptionFilter] = useState<
    "all" | "only" | "exclude"
  >("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetDoc, setTargetDoc] = useState<{
    id: string;
    filename: string;
  } | null>(null);
  const [defCount, setDefCount] = useState(0);
  const [markReferenceCount, setMarkReferenceCount] = useState(0);

  const isAdmin = auth?.user?.role === "ADMIN";

  const filteredDocuments = useMemo(() => {
    const filtered = data.filter((doc) => {
      if (moduleDescriptionFilter === "only" && !doc.moduleDescription) {
        return false;
      }

      if (moduleDescriptionFilter === "exclude" && doc.moduleDescription) {
        return false;
      }

      return matchesSearch(doc, deferredSearchValue);
    });

    filtered.sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return sortOrder === "latest"
        ? rightTime - leftTime
        : leftTime - rightTime;
    });

    return filtered;
  }, [data, deferredSearchValue, moduleDescriptionFilter, sortOrder]);

  const resetConfirmation = () => {
    setConfirmOpen(false);
    setTargetDoc(null);
    setDefCount(0);
    setMarkReferenceCount(0);
  };

  const { mutateAsync: checkDefs } = useMutation({
    mutationFn: (documentId: string) =>
      checkDocumentDefinitions({ data: { documentId } }),
  });

  const { mutate: removeDoc, isPending } = useMutation({
    mutationFn: (documentId: string) =>
      deleteDocument({ data: { documentId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: myDocumentsQuery.queryKey,
      });
    },
  });

  if (isLoading) {
    return (
      <Stack align="center" p="xl">
        <Loader />
      </Stack>
    );
  }

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between" align="flex-end">
          <Title order={2}>{title}</Title>
          <Group align="flex-end">
            <TextInput
              label="Search files"
              placeholder="Filename, repo, path, language"
              value={searchValue}
              onChange={(event) => setSearchValue(event.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              w={280}
            />
            <Select
              label="Module descriptions"
              value={moduleDescriptionFilter}
              onChange={(value) =>
                setModuleDescriptionFilter(
                  (value as "all" | "only" | "exclude") ?? "all",
                )
              }
              data={[
                { value: "all", label: "Show all" },
                { value: "only", label: "Only module descriptions" },
                { value: "exclude", label: "Hide module descriptions" },
              ]}
              allowDeselect={false}
              w={220}
            />
          </Group>
        </Group>

        {isAdmin && (
          <Text size="sm" c="blue">
            Showing all documents (ADMIN ACCESS)
          </Text>
        )}

        {filteredDocuments.length === 0 ? (
          <Text c="dimmed">
            {data.length === 0
              ? "No files uploaded yet."
              : "No files match the current search or filters."}
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={1100}>
            <Table highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>File</Table.Th>
                  <Table.Th ta="center">Definitions</Table.Th>
                  <Table.Th ta="center">Marked References</Table.Th>
                  <Table.Th ta="center">Pages</Table.Th>
                  <Table.Th ta="right">Size</Table.Th>
                  <Table.Th>
                    <Group gap="xs" wrap="nowrap">
                      <Text inherit fw={500}>
                        Added
                      </Text>

                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        aria-label="Toggle added date sort order"
                        onClick={() =>
                          setSortOrder((current) =>
                            current === "latest" ? "oldest" : "latest",
                          )
                        }
                      >
                        {sortOrder === "latest" ? (
                          <IconSortDescending size={14} />
                        ) : (
                          <IconSortAscending size={14} />
                        )}
                      </ActionIcon>
                    </Group>
                  </Table.Th>
                  <Table.Th ta="center">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredDocuments.map((doc) => (
                  <Table.Tr
                    key={doc.id}
                    style={{ cursor: "pointer" }}
                    onClick={() =>
                      navigate({
                        to: "/files/$documentId",
                        params: { documentId: doc.id },
                      })
                    }
                  >
                    <Table.Td>
                      <Stack gap={2}>
                        <Group gap={6} wrap="nowrap">
                          <Text fw={600}>{doc.filename}</Text>

                          {doc.moduleDescription && (
                            <Tooltip label="Module description" withArrow>
                              <ThemeIcon
                                size="sm"
                                radius="xl"
                                color="teal"
                                variant="light"
                              >
                                <IconFileDescription size={13} />
                              </ThemeIcon>
                            </Tooltip>
                          )}
                        </Group>

                        <Text size="xs" c="dimmed">
                          [{doc.futureRepo}] [{doc.filePath}] [{doc.language}]
                        </Text>
                      </Stack>
                    </Table.Td>

                    <Table.Td ta="center">
                      <Badge variant="light">{doc.definitionCount}</Badge>
                    </Table.Td>

                    <Table.Td ta="center">
                      <Badge variant="light" color="orange">
                        {doc.markReferenceCount}
                      </Badge>
                    </Table.Td>

                    <Table.Td ta="center">
                      <Badge variant="light" color="grape">
                        {doc.pageCount}
                      </Badge>
                    </Table.Td>

                    <Table.Td ta="right">
                      <Text size="sm">
                        {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="sm">{formatDate(doc.createdAt)}</Text>
                    </Table.Td>

                    <Table.Td ta="center">
                      <Group gap="xs" justify="center">
                        <UploadAttributionInfo
                          attributions={[
                            { label: "Uploaded by", user: doc.user },
                          ]}
                        />

                        <ActionIcon
                          color="red"
                          variant="subtle"
                          loading={isPending}
                          onClick={async (event) => {
                            event.preventDefault();
                            event.stopPropagation();

                            const res = await checkDefs(doc.id);
                            setTargetDoc({ id: doc.id, filename: doc.filename });
                            setDefCount(res.definitionCount);
                            setMarkReferenceCount(res.markReferenceCount);
                            setConfirmOpen(true);
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>

      <Modal
        opened={confirmOpen}
        onClose={resetConfirmation}
        title="Confirm Deletion"
        centered
      >
        <Text size="sm" mb="md">
          Delete{" "}
          <Text span fw={700}>
            {targetDoc?.filename}
          </Text>
          ?
        </Text>

        <Text size="sm" c="dimmed" mb="md">
          {defCount > 0 || markReferenceCount > 0
            ? [
                defCount > 0
                  ? `${defCount} definition${defCount === 1 ? "" : "s"}`
                  : null,
                markReferenceCount > 0
                  ? `${markReferenceCount} mark reference${markReferenceCount === 1 ? "" : "s"}`
                  : null,
              ]
                .filter(Boolean)
                .join(" and ") +
              " are associated with this document. Deleting this file will permanently remove them."
            : "This action cannot be undone."}
        </Text>

        <Group grow>
          <Button
            variant="default"
            onClick={resetConfirmation}
            disabled={isPending}
          >
            Cancel
          </Button>

          <Button
            color="red"
            loading={isPending}
            onClick={() => {
              if (!targetDoc) return;
              removeDoc(targetDoc.id);
              resetConfirmation();
            }}
          >
            {defCount > 0 || markReferenceCount > 0
              ? "Delete Anyway"
              : "Delete"}
          </Button>
        </Group>
      </Modal>
    </>
  );
}
