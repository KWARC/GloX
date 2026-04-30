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

  const { data: auth } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
    staleTime: 60_000,
  });

  const role = auth?.user?.role;
  const isAdmin = role === "ADMIN";

  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetDoc, setTargetDoc] = useState<string | null>(null);
  const [defCount, setDefCount] = useState(0);

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
        <Title order={2}>Uploaded Files</Title>

        {isAdmin && (
          <Text size="sm" c="blue">
            Showing all documents (ADMIN ACCESS)
          </Text>
        )}

        {data.length === 0 ? (
          <Text c="dimmed">No files uploaded yet</Text>
        ) : (
          data.map((doc) => (
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

                      if (res.definitionCount > 0) {
                        setTargetDoc(doc.id);
                        setDefCount(res.definitionCount);
                        setConfirmOpen(true);
                        return;
                      }

                      removeDoc(doc.id);
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>

                <Text size="sm" c="dimmed">
                  {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                </Text>

                <Text size="sm" c="dimmed">
                  {doc.futureRepo} / {doc.filePath} ({doc.language})
                </Text>

                <Text size="sm" c="dimmed">
                  Status: {doc.status}
                </Text>
              </Card>
            </Link>
          ))
        )}
      </Stack>

      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Deletion"
        centered
      >
        <Text size="sm" mb="md">
          {defCount} definitions are associated with this document. Deleting
          this file will permanently remove all of them.
        </Text>

        <Button
          color="red"
          fullWidth
          loading={isPending}
          onClick={() => {
            if (!targetDoc) return;
            removeDoc(targetDoc);
            setConfirmOpen(false);
          }}
        >
          Delete Anyway
        </Button>
      </Modal>
    </>
  );
}
