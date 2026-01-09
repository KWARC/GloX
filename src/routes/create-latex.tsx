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
  Title,
  ActionIcon,
  Tooltip,
  Badge,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";

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

  const handleDownload = () => {
    const blob = new Blob([displayLatex], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "document.tex";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Box p="xl" h="100dvh" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <Stack align="center" justify="center" h="100%">
          <Loader size="xl" color="white" />
          <Text size="lg" c="white" fw={500}>
            Generating LaTeX with dependencies…
          </Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box p="xl" h="100dvh" style={{ background: "#f8f9fa" }}>
      <Stack h="100%" gap="lg">
        <Paper p="lg" shadow="sm" radius="md" withBorder>
          <Group justify="space-between" align="center">
            <Group gap="md">
              <Title order={2} style={{ color: "#667eea" }}>
                LaTeX Editor
              </Title>
              <Badge color="violet" variant="light" size="lg">
                sTeX
              </Badge>
            </Group>

            <Group gap="xs">
              <Tooltip label="Download LaTeX">
                <ActionIcon
                  variant="light"
                  color="green"
                  size="lg"
                  onClick={handleDownload}
                >
                  <Download size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {(futureRepo || filePath || fileName || language) && (
            <Text size="sm" c="dimmed" mt="xs" ff="monospace">
              {[futureRepo, filePath, fileName, language].filter(Boolean).join(" / ")}
            </Text>
          )}
        </Paper>

        <Paper 
          withBorder 
          shadow="md" 
          radius="md" 
          style={{ flex: 1, overflow: "hidden" }}
        >
          <Textarea
            value={displayLatex}
            onChange={(e) => setEditedLatex(e.currentTarget.value)}
            resize="none"
            placeholder="Your LaTeX content will appear here..."
            styles={{
              root: { height: "100%" },
              wrapper: { height: "100%" },
              input: {
                height: "100%",
                fontFamily: "'Fira Code', 'Consolas', monospace",
                fontSize: 14,
                lineHeight: 1.6,
                backgroundColor: "white",
                border: "none",
              },
            }}
          />
        </Paper>

        <Paper p="md" shadow="sm" radius="md" withBorder>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {displayLatex.length} characters • {displayLatex.split("\n").length} lines
            </Text>
            
            <Group gap="sm">
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

              <Button
                variant="gradient"
                gradient={{ from: "violet", to: "grape", deg: 90 }}
              >
                Save
              </Button>
            </Group>
          </Group>
        </Paper>
      </Stack>
    </Box>
  );
}