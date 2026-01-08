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
  validateSearch: (search: { documentId?: string }) => search,
  component: CreateLatexPage,
});

function CreateLatexPage() {
  const navigate = useNavigate();
  const { documentId } = Route.useSearch();

  const [editedLatex, setEditedLatex] = useState<string | null>(null);

  const { data: extracts = [] } = useQuery({
    queryKey: ["extracts", documentId],
    queryFn: () => listExtractedText({ data: { documentId } as any }),
    enabled: !!documentId,
  });

  const { data: definitions = [] } = useQuery({
    queryKey: ["definitions", documentId],
    queryFn: () =>
      listDefiniendaByDocument({ data: { documentId: documentId! } }),
    enabled: !!documentId,
  });

  const latex = generateLatex({
    title: "",
    moduleName: "",
    imports: ["{p?s}", "[a]{p?s}"],
    definitions: definitions.map(definiendumToLatex).filter(Boolean),

    extracts: extracts.map((e) => e.statement),
  });

  const displayLatex = editedLatex ?? latex;

  return (
    <Box p="md" h="100dvh">
      <Stack h="100%">
        <Text fw={600}>LaTeX (sTeX)</Text>

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
