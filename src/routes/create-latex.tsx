import { currentUser } from "@/server/auth/currentUser";
import { injectProvenance } from "@/server/ftml/addProvenanceData";
import { generateStexFromFtml } from "@/server/ftml/generateStexFromFtml";
import { getCombinedDefinitionFtml } from "@/serverFns/definitionAggregate.server";
import { getDefinitionProvenance } from "@/serverFns/definitionProvenance.server";
import {
  getDefinitionFileStatus,
  updateDefinitionsStatusByIdentity,
} from "@/serverFns/definitionStatus.server";
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
  loader: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) {
      throw redirect({ to: "/login" });
    }
    return null;
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
        data: {
          documentId,
          futureRepo,
          filePath,
          fileName,
          language,
        },
      }),
  });

  const { data: definitionStatus } = useQuery({
    queryKey: [
      "definition-status",
      documentId,
      futureRepo,
      filePath,
      fileName,
      language,
    ],
    queryFn: () =>
      getDefinitionFileStatus({
        data: {
          documentId,
          futureRepo,
          filePath,
          fileName,
          language,
        },
      }),
  });

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
              <Title order={2}>LaTeX Preview</Title>
              <Badge>sTeX</Badge>

              {definitionStatus === "SUBMITTED_TO_MATHHUB" && (
                <Badge color="green">MathHub Submitted</Badge>
              )}
            </Group>

            <Group>
              {definitionStatus === "FINALIZED_IN_FILE" && (
                <Button
                  size="xs"
                  color="green"
                  onClick={async () => {
                    const confirmSubmit = confirm(
                      "Submit to MathHub? Editing will be locked.",
                    );
                    if (!confirmSubmit) return;

                    await updateDefinitionsStatusByIdentity({
                      data: {
                        identity: {
                          documentId,
                          futureRepo,
                          filePath,
                          fileName,
                          language,
                        },
                        status: "SUBMITTED_TO_MATHHUB",
                      },
                    });

                    alert("MathHub submission successful");
                    navigate({ to: "/" });
                  }}
                >
                  Submit to MathHub
                </Button>
              )}

              <Button
                size="xs"
                variant="light"
                onClick={() => setHistoryOpen(true)}
                disabled={
                  definitionStatus === "FINALIZED_IN_FILE" ||
                  definitionStatus === "SUBMITTED_TO_MATHHUB"
                }
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

        <Paper withBorder style={{ flex: 1 }}>
          <Textarea
            readOnly={
              definitionStatus === "FINALIZED_IN_FILE" ||
              definitionStatus === "SUBMITTED_TO_MATHHUB"
            }
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
                backgroundColor: "white",
                opacity: 1,
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

            <Group gap="sm">
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

              <Button
                onClick={handleSaveDraft}
                loading={savingDraft}
                disabled={
                  isFromHistory ||
                  definitionStatus === "FINALIZED_IN_FILE" ||
                  definitionStatus === "SUBMITTED_TO_MATHHUB"
                }
              >
                Save Draft
              </Button>

              <Button
                variant="gradient"
                gradient={{ from: "violet", to: "grape" }}
                onClick={handleSaveFinal}
                loading={savingFinal}
                disabled={
                  definitionStatus === "FINALIZED_IN_FILE" ||
                  definitionStatus === "SUBMITTED_TO_MATHHUB"
                }
              >
                Save Final
              </Button>
            </Group>
          </Group>
        </Paper>
      </Stack>
    </Box>
  );
}
