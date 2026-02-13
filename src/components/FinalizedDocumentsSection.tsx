import {
  FinalizedLatexDocument,
  getFinalizedDocuments,
} from "@/serverFns/latex.server";
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
import { useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";

export function FinalizedDocumentsSection() {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const { data: finalizedDocs = [], isLoading } = useQuery({
    queryKey: ["finalizedDocuments"],
    queryFn: getFinalizedDocuments,
  });

  const displayedDocs = showAll ? finalizedDocs : finalizedDocs.slice(0, 4);
  const hasMore = finalizedDocs.length > 4;

  const handleDocumentClick = (doc: FinalizedLatexDocument) => {
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
    <Stack w="100%" maw={900} gap="md">
      <Group justify="space-between">
        <Title order={3}>Your Finalized Documents</Title>
        {isLoading && <Loader size="sm" />}
      </Group>

      {!isLoading && finalizedDocs.length === 0 && (
        <Paper p="lg" withBorder>
          <Text c="dimmed" ta="center">
            No finalized documents yet.
          </Text>
        </Paper>
      )}

      {displayedDocs.map((doc) => (
        <Card
          key={doc.id}
          withBorder
          style={{ cursor: "pointer" }}
          onClick={() => handleDocumentClick(doc)}
        >
          <Group justify="space-between">
            <Group>
              <FileText size={22} />
              <Stack gap={2}>
                <Text fw={500}>{doc.fileName}</Text>
                <Text size="xs" c="dimmed" ff="monospace">
                  {[doc.futureRepo, doc.filePath, doc.language]
                    .filter(Boolean)
                    .join(" / ")}
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
        <Button variant="subtle" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show Less" : `Show ${finalizedDocs.length - 4} More`}
        </Button>
      )}
    </Stack>
  );
}
