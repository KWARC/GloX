import { FtmlPreview } from "@/components/FtmlPreview";
import type { TexFilePreview } from "@/lib/moduleDescriptionTex";
import { downloadTexFilesAsZip } from "@/lib/texZipExport";
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { ArrowLeftRight, Copy, Download } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import type { FloDownStatement } from "@/types/floDown.types";

type ModuleDescriptionLatexModalProps = {
  opened: boolean;
  moduleTex: TexFilePreview;
  definitionTex: TexFilePreview[];
  onClose: () => void;
};

function ModuleUriInfoButton({ uri }: { uri: string }) {
  const [copied, setCopied] = useState(false);

  async function copyUri(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    await navigator.clipboard.writeText(uri);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Tooltip
      label={copied ? "Copied!" : uri}
      withArrow
      multiline
      maw={420}
    >
      <ActionIcon
        aria-label="Copy LaTeX module URI"
        variant="subtle"
        color={copied ? "teal" : "gray"}
        size="sm"
        onClick={(event) => void copyUri(event)}
      >
        <IconInfoCircle size={16} />
      </ActionIcon>
    </Tooltip>
  );
}

function downloadTex(fileName: string, tex: string) {
  const blob = new Blob([tex], { type: "application/x-tex" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const previewPanelStyles = {
  minHeight: 420,
  maxHeight: "60vh",
  overflowY: "auto" as const,
};

function TexPreviewPanel({
  fileName,
  tex,
  ftmlStatement,
  declaredSymbols,
  declaredSymbolsInfo,
}: {
  fileName: string;
  tex: string;
  ftmlStatement: FloDownStatement;
  declaredSymbols?: readonly string[];
  declaredSymbolsInfo?: unknown;
}) {
  const [showFtml, setShowFtml] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyTex() {
    await navigator.clipboard.writeText(tex);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Stack gap="xs">
      <Group justify="flex-end" gap="xs">
        <Button
          variant="light"
          size="compact-sm"
          leftSection={<Copy size={14} />}
          onClick={() => void copyTex()}
        >
          {copied ? "Copied!" : "Copy .tex"}
        </Button>
        <Button
          variant="light"
          size="compact-sm"
          leftSection={<ArrowLeftRight size={14} />}
          onClick={() => setShowFtml((value) => !value)}
        >
          {showFtml ? "Show sTeX" : "Show FTML"}
        </Button>
        <Button
          variant="light"
          size="compact-sm"
          leftSection={<Download size={14} />}
          onClick={() => downloadTex(fileName, tex)}
        >
          Download .tex
        </Button>
      </Group>
      {showFtml ? (
        <Box
          p="sm"
          style={{
            ...previewPanelStyles,
            backgroundColor: "var(--mantine-color-gray-0)",
            borderRadius: "var(--mantine-radius-sm)",
            border: "1px solid var(--mantine-color-gray-3)",
          }}
        >
          <FtmlPreview
            ftmlAst={ftmlStatement}
            docId={`latex-preview-${fileName}`}
            declaredSymbols={declaredSymbols ? [...declaredSymbols] : undefined}
            declaredSymbolsInfo={declaredSymbolsInfo}
          />
        </Box>
      ) : (
        <Textarea
          value={tex}
          readOnly
          autosize
          minRows={20}
          maxRows={28}
          styles={{
            input: {
              fontFamily: "monospace",
              fontSize: 13,
              lineHeight: 1.6,
              backgroundColor: "var(--mantine-color-gray-0)",
              overflowY: "auto",
              resize: "none",
            },
          }}
        />
      )}
    </Stack>
  );
}

export function ModuleDescriptionLatexModal({
  opened,
  moduleTex,
  definitionTex,
  onClose,
}: ModuleDescriptionLatexModalProps) {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setOpenAccordion(definitionTex.length === 0 ? "module" : null);
    }
  }, [opened, definitionTex.length]);

  const files: { id: string; label: string; color?: string; file: TexFilePreview }[] =
    [
      {
        id: "module",
        label: "Module file",
        color: "blue",
        file: moduleTex,
      },
      ...definitionTex.map((file) => ({
        id: file.fileName,
        label: "Definition",
        color: "violet",
        file,
      })),
    ];

  const allTexFiles = files.map(({ file }) => file);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group justify="space-between" w="100%" wrap="nowrap">
          <Text fw={600}>Module description LaTeX</Text>
          <Button
            variant="light"
            size="compact-sm"
            leftSection={<Download size={14} />}
            onClick={() => downloadTexFilesAsZip(allTexFiles)}
          >
            Download all
          </Button>
        </Group>
      }
      size="xl"
      padding="lg"
    >
      <Accordion
        variant="separated"
        radius="md"
        value={openAccordion}
        onChange={setOpenAccordion}
      >
        {files.map(({ id, label, color, file }) => (
          <Accordion.Item key={id} value={id}>
            <Accordion.Control>
              <Group gap="xs">
                <Text fw={600} size="sm">
                  {label}
                </Text>
                <Badge
                  size="sm"
                  variant="light"
                  color={color}
                  style={{ textTransform: "none" }}
                >
                  {file.fileName}
                </Badge>
                <ModuleUriInfoButton uri={file.uri} />
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <TexPreviewPanel
                fileName={file.fileName}
                tex={file.tex}
                ftmlStatement={file.ftmlStatement}
                declaredSymbols={file.declaredSymbols}
                declaredSymbolsInfo={file.declaredSymbolsInfo}
              />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Modal>
  );
}
