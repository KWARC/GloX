import { MyDocument, myDocumentsQuery } from "@/queries/document";
import { currentUser } from "@/server/auth/currentUser";
import { Card, Loader, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

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
  if (isLoading) {
    return (
      <Stack align="center" p="xl">
        <Loader />
      </Stack>
    );
  }

  return (
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
              <Text fw={500}>{doc.filename}</Text>

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
  );
}
