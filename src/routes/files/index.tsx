import { MyDocument, myDocumentsQuery } from "@/queries/document";
import { currentUser } from "@/server/auth/currentUser";
import {
  checkDocumentDefinitions,
  deleteDocument,
} from "@/serverFns/deleteDocument.server";

import {
  ActionIcon,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/files/")({
  loader: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) {
      throw redirect({ to: "/login" });
    }
    return null;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data = [], isLoading } = useQuery<MyDocument[]>(myDocumentsQuery);
  const [moduleDescriptionFilter, setModuleDescriptionFilter] = useState<
    "all" | "only" | "exclude"
  >("all");

  const { data: auth } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
    staleTime: 60_000,
  });

  const role = auth?.user?.role;
  const isAdmin = role === "ADMIN";

  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetDoc, setTargetDoc] = useState<{
    id: string;
    filename: string;
  } | null>(null);
  const [defCount, setDefCount] = useState(0);
  const [markReferenceCount, setMarkReferenceCount] = useState(0);

  const filteredDocuments = data.filter((doc) => {
    if (moduleDescriptionFilter === "only") return doc.moduleDescription;
    if (moduleDescriptionFilter === "exclude") return !doc.moduleDescription;
    return true;
  });

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
      <Stack p="md">
        <Group justify="space-between" align="flex-end">
          <Title order={2}>Uploaded Files</Title>
          <Select
            label="Module Descriptions"
            value={moduleDescriptionFilter}
            onChange={(value) =>
              setModuleDescriptionFilter(
                (value as "all" | "only" | "exclude") ?? "all",
              )
            }
            data={[
              { value: "all", label: "Show All" },
              { value: "only", label: "Show Module Descriptions" },
              { value: "exclude", label: "Hide Module Descriptions" },
            ]}
            allowDeselect={false}
            w={240}
            size="sm"
          />
        </Group>

        {isAdmin && (
          <Text size="sm" c="blue">
            Showing all documents (ADMIN ACCESS)
          </Text>
        )}

        {filteredDocuments.length === 0 ? (
          <Stack gap="xs" align="flex-start">
            <Text c="dimmed">
              {data.length === 0
                ? "No files uploaded yet"
                : "No files match the selected filter"}
            </Text>
            <Button component={Link} to="/" variant="light">
              Go to Upload Page
            </Button>
          </Stack>
        ) : (
          filteredDocuments.map((doc) => (
            <Link
              key={doc.id}
              to="/files/$documentId"
              params={{ documentId: doc.id }}
              style={{ textDecoration: "none" }}
            >
              <Card withBorder style={{ cursor: "pointer" }}>
                <Group justify="space-between">
                  <Text fw={500}>{doc.filename}</Text>

                  <ActionIcon
                    color="red"
                    variant="subtle"
                    loading={isPending}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      const res: any = await checkDefs(doc.id);

                      setTargetDoc({
                        id: doc.id,
                        filename: doc.filename,
                      });
                      setDefCount(res.definitionCount);
                      setMarkReferenceCount(res.markReferenceCount);
                      setConfirmOpen(true);
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>

                <Text size="sm" c="dimmed">
                  {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                </Text>

                <Text size="sm" c="dimmed">
                  [{doc.futureRepo}] [{doc.filePath}] [{doc.language}]
                </Text>

                <Text size="sm" c="dimmed">
                  Status: {doc.status}
                </Text>

                <Text size="sm" c="dimmed">
                  Module Description: {doc.moduleDescription ? "Yes" : "No"}
                </Text>
              </Card>
            </Link>
          ))
        )}
      </Stack>

      <Modal
        opened={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setTargetDoc(null);
          setDefCount(0);
          setMarkReferenceCount(0);
        }}
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
            onClick={() => {
              setConfirmOpen(false);
              setTargetDoc(null);
              setDefCount(0);
              setMarkReferenceCount(0);
            }}
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
              setConfirmOpen(false);
              setTargetDoc(null);
              setDefCount(0);
              setMarkReferenceCount(0);
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
