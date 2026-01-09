import { generateLatex } from "@/components/generateLatex";
import { definiendumToLatex } from "@/server/text-selection";
import { listDefiniendaByDocument } from "@/serverFns/definiendum.server";
import { listExtractedText } from "@/serverFns/extractText.server";
import {
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/create-latex")({
  validateSearch: (search: {
    documentId?: string;
    futureRepo?: string;
    filePath?: string;
    fileName?: string;
    language?: string;
  }) => search,
  component: CreateLatexPage,
});

function CreateLatexPage() {
  const navigate = useNavigate();
  const { documentId, futureRepo, filePath, fileName, language } =
    Route.useSearch();

  const [editedLatex, setEditedLatex] = useState<string | null>(null);

  const { data: extracts = [] } = useQuery({
    queryKey: ["extracts", documentId],
    queryFn: () => listExtractedText({ data: { documentId } as any }),
    enabled: !!documentId,
  });

  const { data: definitions = [] } = useQuery({
    queryKey: [
      "definitions",
      documentId,
      futureRepo,
      filePath,
      fileName,
      language,
    ],
    queryFn: () =>
      listDefiniendaByDocument({
        data: { documentId: documentId! },
      } as any),
    enabled: !!documentId,
  });

  const filteredExtracts = extracts.filter((e) => {
    if (futureRepo && e.futureRepo !== futureRepo) return false;
    if (filePath && e.filePath !== filePath) return false;
    if (fileName && e.fileName !== fileName) return false;
    if (language && e.language !== language) return false;
    return true;
  });

  const filteredDefinitions = definitions.filter((d) => {
    if (futureRepo && d.futureRepo !== futureRepo) return false;
    if (filePath && d.filePath !== filePath) return false;
    if (fileName && d.fileName !== fileName) return false;
    if (language && d.language !== language) return false;
    return true;
  });

  const latex = generateLatex({
    title: "",
    moduleName: fileName || "",
    imports: ["{p?s}", "[a]{p?s}"],
    definitions: filteredDefinitions.map(definiendumToLatex).filter(Boolean),
    extracts: filteredExtracts.map((e) => e.statement),
  });

  const displayLatex = editedLatex ?? latex;

  return (
    <Box p="md" h="100dvh">
      <Stack h="100%">
        <Group justify="space-between">
          <Text fw={600}>LaTeX (sTeX)</Text>
          {(futureRepo || filePath || fileName || language) && (
            <Text size="sm" c="dimmed">
              {futureRepo}/{filePath}/{fileName}/{language}
            </Text>
          )}
        </Group>

        <Paper withBorder style={{ flex: 1 }}>
          <Textarea
            value={displayLatex}
            onChange={(e) => setEditedLatex(e.currentTarget.value)}
            resize="none"
            styles={{
              root: { height: "100%" },
              wrapper: { height: "100%" },
              input: {
                height: "100%",
                fontFamily: "monospace",
                fontSize: 13,
              },
            }}
          />
        </Paper>

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => {
              if (!documentId) return;
              navigate({
                to: "/my-files/$documentId",
                params: { documentId },
              });
            }}
          >
            Back
          </Button>

          <Button>Save</Button>
        </Group>
      </Stack>
    </Box>
  );
}
