import {
  buildMarkReferenceLatex,
  getMarkReferenceLatexDownloadName,
} from "@/lib/markReferenceLatex";
import { MarkedReferenceList } from "@/components/MarkedReferenceList";
import {
  Accordion,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";

type MarkReferenceFile = {
  id: string;
  filename: string;
  futureRepo: string;
  filePath: string;
  language: string;
  moduleDescription: boolean;
  indexStatus: "EXTRACTED" | "FINALIZED" | "SUBMITTED_TO_MATHHUB" | null;
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

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="md">
        <Box>
          <Title order={4}>Index Files</Title>
        </Box>

        {files.length === 0 ? (
          <Text size="sm" c="dimmed">
            No index files match the selected filters.
          </Text>
        ) : (
          <Accordion variant="separated" radius="sm">
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
            <Accordion.Item key={file.id} value={file.id}>
              <Accordion.Control>
                <Group justify="space-between" wrap="wrap" gap="sm">
                  <Stack gap={2}>
                    <Text fw={600}>{file.filename}</Text>
                    <Text size="xs" c="dimmed">
                      {file.futureRepo} / {file.filePath} ({file.language})
                    </Text>
                  </Stack>
                  <Group gap="xs">
                    {file.moduleDescription && (
                      <Badge variant="light" color="blue">
                        Module Description
                      </Badge>
                    )}
                    {file.indexStatus && (
                      <Badge variant="light" color="teal">
                        {file.indexStatus}
                      </Badge>
                    )}
                    <Badge variant="light" color="gray">
                      {file.markReferences.length} references
                    </Badge>
                  </Group>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Group justify="flex-end">
                    <Button
                      size="xs"
                      variant="light"
                      color="indigo"
                      onClick={() => void handleDownload(file)}
                    >
                      index.en.tex
                    </Button>
                  </Group>

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
              </Accordion.Panel>
            </Accordion.Item>
          );
            })}
          </Accordion>
        )}
      </Stack>
    </Paper>
  );
}
