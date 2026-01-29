import UploadDialog from "@/components/UploadDialog";
import { currentUser } from "@/server/auth/currentUser";
import { getFinalizedDocuments } from "@/serverFns/latex.server";
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const navigate = useNavigate();
  const [opened, setOpened] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
    retry: false,
    staleTime: 60_000,
  });

  const { data: finalizedDocs, isLoading: docsLoading } = useQuery({
    queryKey: ["finalizedDocuments"],
    queryFn: getFinalizedDocuments,
    enabled: !!user?.loggedIn,
  });

  const isLoggedIn = user?.loggedIn;

  const displayedDocs = showAll ? finalizedDocs : finalizedDocs?.slice(0, 4);

  const hasMore = (finalizedDocs?.length ?? 0) > 4;

  const handleDocumentClick = (doc: any) => {
    navigate({
      to: "/create-latex",
      search: {
        documentId: doc.documentId,
        futureRepo: doc.futureRepo,
        filePath: doc.filePath,
        fileName: doc.fileName,
        language: doc.language,
      },
    });
  };

  return (
    <>
      <Stack align="center" justify="center" mih="100vh" p="xl" gap="xl">
        <Stack align="center" gap="md">
          <Title order={1}>GloX</Title>
          <Text c="dimmed">
            Knowledge curation from PDFs with OCR and structured definitions.
          </Text>

          <Button
            onClick={() => setOpened(true)}
            disabled={!isLoggedIn}
            title={!isLoggedIn ? "Please login to upload files" : ""}
          >
            Upload PDF
          </Button>
        </Stack>

        {isLoggedIn && (
          <Stack w="100%" maw={800} gap="md">
            <Group justify="space-between" align="center">
              <Title order={3}>Your Finalized Documents</Title>
              {docsLoading && <Loader size="sm" />}
            </Group>

            {!docsLoading && finalizedDocs && finalizedDocs.length === 0 && (
              <Paper p="lg" withBorder radius="md">
                <Text c="dimmed" ta="center">
                  No finalized documents yet. Upload a PDF and create your first
                  LaTeX document!
                </Text>
              </Paper>
            )}

            {displayedDocs && displayedDocs.length > 0 && (
              <Stack gap="sm">
                {displayedDocs.map((doc) => (
                  <Card
                    key={doc.id}
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    withBorder
                    style={{ cursor: "pointer" }}
                    onClick={() => handleDocumentClick(doc)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="md">
                        <FileText size={24} color="#667eea" />
                        <Stack gap={4}>
                          <Text fw={500}>{doc.fileName}</Text>
                          <Text size="xs" c="dimmed" ff="monospace">
                            {[doc.futureRepo, doc.filePath, doc.language]
                              .filter(Boolean)
                              .join(" / ")}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Updated:{" "}
                            {new Date(doc.updatedAt).toLocaleDateString()}
                          </Text>
                        </Stack>
                      </Group>
                      <Badge color="green" variant="light">
                        Final
                      </Badge>
                    </Group>
                  </Card>
                ))}

                {hasMore && (
                  <Button
                    variant="subtle"
                    onClick={() => setShowAll(!showAll)}
                    fullWidth
                  >
                    {showAll
                      ? "Show Less"
                      : `Show ${(finalizedDocs?.length ?? 0) - 4} More`}
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        )}
      </Stack>

      <UploadDialog opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}
