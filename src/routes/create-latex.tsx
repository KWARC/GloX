import { currentUser } from "@/server/auth/currentUser";
import { generateStexFromFtml } from "@/server/ftml/generateStexFromFtml";
import { getCombinedDefinitionFtml } from "@/serverFns/definitionAggregate.server";
import { getDefinitionProvenance } from "@/serverFns/definitionProvenance.server";
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

type CreateLatexSearch = {
  documentId: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const Route = createFileRoute("/create-latex")({
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) throw redirect({ to: "/login" });
  },

  validateSearch: (search: Record<string, unknown>): CreateLatexSearch => {
    return {
      documentId: search.documentId as string,
      futureRepo: search.futureRepo as string,
      filePath: search.filePath as string,
      fileName: search.fileName as string,
      language: search.language as string,
    };
  },

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

  const { data: ftmlAst, isLoading: ftmlLoading } = useQuery({
    queryKey: [
      "combined-ftml",
      documentId,
      futureRepo,
      filePath,
      fileName,
      language,
    ],
    queryFn: () =>
      getCombinedDefinitionFtml({
        data: {
          documentId,
          futureRepo,
          filePath,
          fileName,
          language,
        },
      }),
  });

  const { data: stex, isLoading: stexLoading } = useQuery({
    queryKey: ["stex", ftmlAst],
    queryFn: () => generateStexFromFtml(ftmlAst!, fileName),
    enabled: !!ftmlAst,
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

  const { data: provenance } = useQuery({
    queryKey: ["definition-provenance", documentId],
    queryFn: () =>
      getDefinitionProvenance({
        data: { documentId },
      }),
  });

  function injectProvenance(
    stexSource: string,
    provenance?: {
      documentName: string;
      pageNumber: number;
    }[],
  ) {
    if (!stexSource || !provenance?.length) return stexSource;

    const lines = provenance.map(
      (p, i) =>
        `%%% Definition ${i + 1}: ${p.documentName} page ${p.pageNumber}`,
    );

    return `${stexSource}

${lines.join("\n")}`;
  }

  const generatedLatex =
    stex && provenance ? injectProvenance(stex, provenance) : (stex ?? "");

  const displayLatex =
    editedLatex ?? generatedLatex ?? historyData?.finalLatex ?? "";

  if (ftmlLoading || stexLoading) {
    return (
      <Box p="xl" h="100dvh">
        <Stack align="center" justify="center" h="100%">
          <Loader size="xl" />
          <Text>Generating sTeX…</Text>
        </Stack>
      </Box>
    );
  }

  const handleDownload = () => {
    const name = `${fileName}.${language}.tex`;
    const blob = new Blob([displayLatex], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();

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

  if (stexLoading) {
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
                onClick={() =>
                  navigate({
                    to: "/my-files/$documentId",
                    params: { documentId },
                  })
                }
              >
                Back
              </Button>

              <Group gap="sm">
                <Tooltip
                  label={
                    isFromHistory
                      ? "Drafts disabled for restored history."
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
