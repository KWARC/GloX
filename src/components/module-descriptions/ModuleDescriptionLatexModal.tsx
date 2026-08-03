import type { TexFilePreview } from "@/lib/moduleDescriptionTex";
import {
  Accordion,
  ActionIcon,
  Badge,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { Download } from "lucide-react";

type ModuleDescriptionLatexModalProps = {
  opened: boolean;
  moduleTex: TexFilePreview;
  definitionTex: TexFilePreview[];
  onClose: () => void;
};

function downloadTex(fileName: string, tex: string) {
  const blob = new Blob([tex], { type: "application/x-tex" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function TexPreviewPanel({
  fileName,
  tex,
}: {
  fileName: string;
  tex: string;
}) {
  return (
    <Stack gap="xs">
      <Group justify="flex-end">
        <Tooltip label="Download .tex">
          <ActionIcon
            variant="light"
            size="sm"
            onClick={() => downloadTex(fileName, tex)}
          >
            <Download size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Textarea
        value={tex}
        readOnly
        autosize
        minRows={16}
        styles={{
          input: {
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.6,
            backgroundColor: "var(--mantine-color-gray-0)",
          },
        }}
      />
    </Stack>
  );
}

export function ModuleDescriptionLatexModal({
  opened,
  moduleTex,
  definitionTex,
  onClose,
}: ModuleDescriptionLatexModalProps) {
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

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600}>Module description LaTeX</Text>}
      size="xl"
      padding="lg"
    >
      <Accordion variant="separated" radius="md">
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
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <TexPreviewPanel fileName={file.fileName} tex={file.tex} />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Modal>
  );
}
