import {
  buildMarkReferenceLatex,
  getMarkReferenceLatexDownloadName,
} from "@/lib/markReferenceLatex";
import { MarkedReferenceList } from "@/components/MarkedReferenceList";
import { Box, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";

type MarkReferenceFile = {
  id: string;
  filename: string;
  futureRepo: string;
  filePath: string;
  language: string;
  markReferences: {
    id: string;
    documentPageId: string;
    pageNumber: number;
    symbolName: string;
    verbalization: string | null;
  }[];
};

export function CurationMarkReferenceBox({
  files,
  deletingMarkReferenceId,
  onDeleteMarkReference,
}: {
  files: MarkReferenceFile[];
  deletingMarkReferenceId?: string | null;
  onDeleteMarkReference?: (referenceId: string) => Promise<void>;
}) {
  async function handleDownload(file: MarkReferenceFile) {
    const latex = await buildMarkReferenceLatex(
      {
        futureRepo: file.futureRepo,
        filePath: file.filePath,
        fileName: file.filename.replace(/\.[^.]+$/, ""),
        language: file.language,
      },
      file.markReferences,
    );

    if (!latex) {
      alert("LaTeX generation failed.");
      return;
    }

    const blob = new Blob([latex], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getMarkReferenceLatexDownloadName(file.filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  if (files.length === 0) return null;

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="md">
        <Box>
          <Title order={4}>Index Files</Title>
        </Box>

        {files.map((file) => {
          const pages = Array.from(
            file.markReferences.reduce<
              Map<
                number,
                {
                  id: string;
                  symbolName: string;
                  verbalization: string | null;
                }[]
              >
            >((acc, reference) => {
              const current = acc.get(reference.pageNumber) ?? [];
              current.push({
                id: reference.id,
                symbolName: reference.symbolName,
                verbalization: reference.verbalization,
              });
              acc.set(reference.pageNumber, current);
              return acc;
            }, new Map()),
          ).sort((a, b) => a[0] - b[0]);

          return (
            <Paper key={file.id} withBorder radius="sm" p="sm">
              <Group justify="space-between" align="center" mb="xs">
                <Text fw={600}>{file.filename}</Text>
                <Button
                  size="xs"
                  variant="light"
                  color="indigo"
                  onClick={() => void handleDownload(file)}
                >
                  index.en.tex
                </Button>
              </Group>

              {pages.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No mark references in this file.
                </Text>
              ) : (
                <Stack gap="sm">
                  {pages.map(([pageNumber, references]) => (
                    <Box key={pageNumber}>
                      <Text
                        size="xs"
                        fw={700}
                        c="dimmed"
                        tt="uppercase"
                        mb={4}
                      >
                        Page {pageNumber}
                      </Text>
                      <MarkedReferenceList
                        references={references}
                        deletingId={deletingMarkReferenceId}
                        onDelete={onDeleteMarkReference}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Paper>
  );
}
