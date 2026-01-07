import { generateLatex } from "@/components/generateLatex";
import {
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/create-latex")({
  validateSearch: (search: { documentId?: string }) => search,
  component: CreateLatexPage,
});

function CreateLatexPage() {
  const navigate = useNavigate();
  const { documentId } = Route.useSearch();
  const [latex, setLatex] = useState(
    generateLatex({
      title: "",
      moduleName: "",
      imports: ["{p?s}", "[a]{p?s}"],
      definition: `A \\definiendum{computer}{computing device} or simply a \\definame{computer} is an
physical (usually electrical or electronic) (example).

A \\sn{computer} consists of physical parts (its \\definame{hardware}) and a \\sn{set} of
\\sns{program?program} and \\sn{data?data}, its \\definame{software}.`,
    })
  );

  return (
    <Box p="md" h="100dvh">
      <Stack h="100%">
        <Text fw={600}>LaTeX (sTeX)</Text>

        <Paper withBorder style={{ flex: 1 }}>
          <Textarea
            value={latex}
            onChange={(e) => setLatex(e.currentTarget.value)}
            autosize={false}
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
