import { currentUser } from "@/server/auth/currentUser";
import {
  getLatexHistory,
  saveLatexDraft,
  saveLatexFinal,
} from "@/serverFns/latex.server";
import { generateLatexWithDependencies } from "@/serverFns/latexGeneration.server";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/create-latex")({
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) throw redirect({ to: "/login" });
  },
  validateSearch: (search: {
    documentId: string;
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  }) => search,
  component: CreateLatexPage,
});

function CreateLatexPage() {
  const navigate = useNavigate();
  const { documentId, futureRepo, filePath, fileName, language } =
    Route.useSearch();

  const [editedLatex, setEditedLatex] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingFinal, setSavingFinal] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false);

  const { data: generatedLatex, isLoading } = useQuery({
    queryKey: ["latex-with-deps", documentId],
    queryFn: async () => {
      if (!documentId || !futureRepo || !filePath || !fileName || !language) {
        return "";
      }

      return generateLatexWithDependencies({
        data: { documentId, futureRepo, filePath, fileName, language },
      });
    },
    enabled: !!documentId,
  });

  const displayLatex = editedLatex ?? generatedLatex ?? "";

  const handleDownload = () => {
    const safeFileName = fileName?.trim() || "document";
    const safeLanguage = language?.trim() || "en";

    const finalName = `${safeFileName}.${safeLanguage}.tex`;

    const blob = new Blob([displayLatex], {
      type: "application/x-tex",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = finalName;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveDraft = async () => {
    if (!documentId) return;

    try {
      setSavingDraft(true);
      await saveLatexDraft({
        data: {
          documentId,
          futureRepo,
          filePath,
          fileName,
          language,
          latex: displayLatex,
        },
      });

      await refetchHistory();
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveFinal = async () => {
    if (!documentId) return;

    try {
      setSavingFinal(true);
      await saveLatexFinal({
        data: {
          documentId,
          futureRepo,
          filePath,
          fileName,
          language,
          latex: displayLatex,
        },
      });

      await refetchHistory();
      navigate({ to: "/" });
    } finally {
      setSavingFinal(false);
    }
  };

  const {
    data: historyData,
    refetch: refetchHistory,
    isFetching: historyLoading,
  } = useQuery({
    queryKey: [
      "latex-history",
      documentId,
      futureRepo,
      filePath,
      fileName,
      language,
    ],
    queryFn: () =>
      getLatexHistory({
        data: {
          documentId,
          futureRepo,
          filePath,
          fileName,
          language,
        },
      }),
    enabled:
      !!documentId && !!futureRepo && !!filePath && !!fileName && !!language,
  });

  if (isLoading) {
    return (
      <Box
        p="xl"
        h="100dvh"
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
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
              <Tooltip label="View Version History">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => setHistoryOpen(true)}
                  disabled={!historyData?.history.length}
                >
                  Version History
                </Button>
              </Tooltip>

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
              {[futureRepo, filePath, fileName, language]
                .filter(Boolean)
                .join(" / ")}
            </Text>
          )}
        </Paper>
        <Modal
          opened={historyOpen}
          onClose={() => setHistoryOpen(false)}
          title="LaTeX Version History"
          size="lg"
        >
          <Stack>
            {historyLoading && <Loader size="sm" />}

            {!historyData?.history.length && (
              <Text size="sm" c="dimmed">
                No drafts saved yet.
              </Text>
            )}

            {historyData?.history.map((entry, i) => (
              <Paper key={i} p="sm" withBorder>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">
                    {new Date(entry.savedAt).toLocaleString()}
                  </Text>

                  <Button
                    size="xs"
                    onClick={() => {
                      setEditedLatex(entry.latex);
                      setIsFromHistory(true);
                      setHistoryOpen(false);
                    }}
                  >
                    Restore
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Modal>

        <Paper
          withBorder
          shadow="md"
          radius="md"
          style={{ flex: 1, overflow: "hidden" }}
        >
          <Textarea
            value={displayLatex}
            onChange={(e) => {
              setEditedLatex(e.currentTarget.value);
              setIsFromHistory(false);
            }}
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
              {displayLatex.length} characters •{" "}
              {displayLatex.split("\n").length} lines
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

              <Group gap="sm">
                <Tooltip
                  label={
                    isFromHistory
                      ? "Drafts are disabled for restored history. Edit or save final."
                      : undefined
                  }
                >
                  <Button
                    variant="default"
                    onClick={handleSaveDraft}
                    loading={savingDraft}
                    disabled={isFromHistory}
                  >
                    Save Draft
                  </Button>
                </Tooltip>

                <Button
                  variant="gradient"
                  gradient={{ from: "violet", to: "grape" }}
                  onClick={handleSaveFinal}
                  loading={savingFinal}
                >
                  Save Final
                </Button>
              </Group>
            </Group>
          </Group>
        </Paper>
      </Stack>
    </Box>
  );
}
