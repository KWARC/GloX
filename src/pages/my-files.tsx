import { useQuery } from "@tanstack/react-query";
import { Stack, Card, Text, Title, Loader } from "@mantine/core";
import { myDocumentsQuery, MyDocument } from "@/queries/document";

export default function MyFilesPage() {
  const {
    data: docs = [],
    isLoading,
    error,
  } = useQuery<MyDocument[]>(myDocumentsQuery);

  if (isLoading) {
    return (
      <Stack align="center" p="xl">
        <Loader />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack align="center" p="xl">
        <Text c="red">You must be logged in to view files</Text>
      </Stack>
    );
  }

  return (
    <Stack p="md">
      <Title order={2}>My Files</Title>

      {docs.length === 0 ? (
        <Text c="dimmed">No files uploaded yet</Text>
      ) : (
        docs.map((doc) => (
          <Card key={doc.id} shadow="sm" padding="lg" withBorder>
            <Text fw={500}>{doc.filename}</Text>

            <Text size="sm" c="dimmed">
              Size: {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
            </Text>

            <Text size="sm" c="dimmed">
              Status: {doc.status}
            </Text>

            <Text size="sm" c="dimmed">
              Uploaded: {new Date(doc.createdAt).toLocaleDateString()}
            </Text>
          </Card>
        ))
      )}
    </Stack>
  );
}
