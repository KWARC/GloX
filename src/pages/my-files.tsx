import { useEffect, useState } from "react";
import { getMyDocuments } from "@/serverFns/myDocuments.server";
import { Stack, Card, Text, Title, Loader } from "@mantine/core";

type Document = {
  id: string;
  filename: string;
  fileHash: string;
  mimeType: string;
  fileSize: number;
  userId: string;
  status: string;
  extractedText: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function MyFilesPage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyDocuments();
        console.log("Full response:", res);
        console.log("Response type:", typeof res);
        console.log("Response keys:", Object.keys(res || {}));

        if (!res?.success) {
          window.location.href = "/?page=login";
          return;
        }

        console.log("Documents:", res.documents);
        setDocs(res.documents || []);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Stack align="center" p="xl">
        <Loader />
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