import { currentUser } from "@/server/auth/currentUser";
import { generateStexFromFtml } from "@/server/ftml/generateStexFromFtml";
import {
  getLatexHistory,
  saveLatexDraft,
  saveLatexFinal,
} from "@/serverFns/latex.server";
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
  validateSearch: (search: Record<string, unknown>) => {
    const base = {
      documentId: search.documentId as string,
      futureRepo: search.futureRepo as string,
      filePath: search.filePath as string,
      fileName: search.fileName as string,
      language: search.language as string,
    };

    if (typeof search.ftml === "string") {
      return { ...base, ftml: search.ftml };
    }

    return base;
  },

  component: CreateLatexPage,
});
function CreateLatexPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const { documentId, futureRepo, filePath, fileName, language } = search;

  const ftml = "ftml" in search ? search.ftml : undefined;

  const isGenerateMode = typeof ftml === "string";
  const ftmlAst = isGenerateMode ? JSON.parse(ftml) : null;

  const [editedLatex, setEditedLatex] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savingFinal, setSavingFinal] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false);

  const { data: stex, isLoading: stexLoading } = useQuery({
    queryKey: ["stex", ftml],
    queryFn: async () => {
      return generateStexFromFtml(ftmlAst);
    },
    staleTime: Infinity,
  });

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
  });
  const displayLatex =
    editedLatex ?? (isGenerateMode ? stex : historyData?.finalLatex) ?? "";

  const handleDownload = () => {
    const finalName = `${fileName || "document"}.${language || "en"}.tex`;
    const blob = new Blob([displayLatex], { type: "application/x-tex" });
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

  if (isGenerateMode && stexLoading) {
    return (
      <Box p="xl" h="100dvh">
        <Stack align="center" justify="center" h="100%">
          <Loader size="xl" />
          <Text>Generating sTeX…</Text>
        </Stack>
      </Box>
    );
  }

  return (
    <Box p="xl" h="100dvh">
      <Stack h="100%" gap="lg">
        <Paper p="lg" withBorder>
          <Group justify="space-between">
            <Group>
              <Title order={2}>LaTeX Editor</Title>
              <Badge>sTeX</Badge>
            </Group>
            <Group>
              <Button
                size="xs"
                variant="light"
                onClick={() => setHistoryOpen(true)}
                disabled={!historyData?.history.length}
              >
                Version History
              </Button>
              <ActionIcon onClick={handleDownload}>
                <Download size={18} />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>

        <Modal
          opened={historyOpen}
          onClose={() => setHistoryOpen(false)}
          title="LaTeX Version History"
        >
          <Stack>
            {historyLoading && <Loader size="sm" />}
            {historyData?.history.map((entry, i) => (
              <Paper key={i} p="sm" withBorder>
                <Group justify="space-between">
                  <Text size="xs">
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

        <Paper withBorder style={{ flex: 1, minHeight: 0 }}>
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
                fontFamily: "monospace",
                fontSize: 14,
                height: "100%",
                resize: "none",
              },
            }}
          />
        </Paper>

        <Paper p="md" withBorder>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {displayLatex.length} characters •{" "}
              {displayLatex.split("\n").length} lines
            </Text>
            <Group>
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
