import { MarkReferenceLatexModal } from "@/components/MarkReferenceLatexModal";
import { MarkedReferenceList } from "@/components/MarkedReferenceList";
import {
  buildMarkReferenceLatex,
  getMarkReferenceLatexDownloadName,
} from "@/lib/markReferenceLatex";
import {
  Accordion,
  Badge,
  Box,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";

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
  deletingId,
  onDelete,
}: {
  files: MarkReferenceFile[];
  deletingId?: string | null;
  onDelete?: (referenceId: string) => Promise<void>;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewCode, setPreviewCode] = useState("");
  const [previewFileName, setPreviewFileName] = useState("");

  async function buildLatex(file: MarkReferenceFile) {
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
      return null;
    }

    return latex;
  }

  async function handlePreview(file: MarkReferenceFile) {
    const latex = await buildLatex(file);
    if (!latex) return;

    setPreviewCode(latex);
    setPreviewFileName(getMarkReferenceLatexDownloadName(file.filename));
    setPreviewOpen(true);
  }

  function handleDownload() {
    if (!previewCode || !previewFileName) return;

    const blob = new Blob([previewCode], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = previewFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  return (
    <Accordion variant="separated" radius="md" defaultValue="index-files">
      <Accordion.Item value="index-files">
        <Accordion.Control>
          <Text fw={600}>Index Files</Text>
        </Accordion.Control>
        <Accordion.Panel>
          {files.length === 0 ? (
            <Text size="sm" c="dimmed">
              No index files.
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
                      <Group justify="space-between" wrap="nowrap" gap="sm">
                        <Stack gap={2} style={{ minWidth: 0 }}>
                          <Text fw={600}>{file.filename}</Text>
                          <Text size="xs" c="dimmed">
                            [{file.futureRepo}] [{file.filePath}] [{file.language}]
                          </Text>
                        </Stack>
                        <Group gap="xs" wrap="nowrap">
                          <Button
                            size="xs"
                            variant="light"
                            color="indigo"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handlePreview(file);
                            }}
                          >
                            index.en.tex
                          </Button>
                          <Badge variant="light" color="gray">
                            {file.markReferences.length} references
                          </Badge>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="sm">
                        {pages.length === 0 ? (
                          <Text size="sm" c="dimmed">
                            No mark references in this file.
                          </Text>
                        ) : (
                          pages.map(([pageNumber, references]) => (
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
                                deletingId={deletingId}
                                onDelete={onDelete}
                              />
                            </Box>
                          ))
                        )}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          )}
        </Accordion.Panel>
      </Accordion.Item>
      <MarkReferenceLatexModal
        opened={previewOpen}
        code={previewCode}
        fileName={previewFileName}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
      />
    </Accordion>
  );
}
