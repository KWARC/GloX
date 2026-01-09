import { generateLatexWithDependencies } from "@/serverFns/latexGeneration.server";
import {
  Box,
  Button,
  Group,
  Loader,
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

  const { data: generatedLatex, isLoading } = useQuery({
    queryKey: ["latex-with-deps", documentId],
    queryFn: async () => {
      if (!documentId) return "";
      return generateLatexWithDependencies({
        data: { documentId, futureRepo, filePath, fileName, language },
      } as any);
    },
    enabled: !!documentId,
  });

  const displayLatex = editedLatex ?? generatedLatex ?? "";

  if (isLoading) {
    return (
      <Box p="md" h="100dvh">
        <Stack align="center" justify="center" h="100%">
          <Loader />
          <Text>Generating LaTeX with dependencies…</Text>
        </Stack>
      </Box>
    );
  }

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

