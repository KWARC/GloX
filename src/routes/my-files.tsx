import { MyDocument, myDocumentsQuery } from "@/queries/document";
import { currentUser } from "@/serverFns/currentUser.server";
import { Card, Loader, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/my-files")({
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data = [], isLoading } = useQuery<MyDocument[]>(myDocumentsQuery);

  if (isLoading) {
    return (
      <Stack align="center" p="xl">
        <Loader />
      </Stack>
    );
  }

  return (
    <Stack p="md">
      <Title order={2}>My Files</Title>

      {data.length === 0 ? (
        <Text c="dimmed">No files uploaded yet</Text>
      ) : (
        data.map((doc) => (
          <Card
            key={doc.id}
            withBorder
            component={Link}
            to="/my-files/$documentId"
            params={{ documentId: doc.id }}
            style={{ cursor: "pointer" }}
          >
            <Text fw={500}>{doc.filename}</Text>
            <Text size="sm" c="dimmed">
              {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
            </Text>
            <Text size="sm" c="dimmed">
              Status: {doc.status}
            </Text>
          </Card>
        ))
      )}
    </Stack>
  );
}
