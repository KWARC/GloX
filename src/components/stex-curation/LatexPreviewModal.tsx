import { FileIdentity } from "@/serverFns/latex.server";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { Download } from "lucide-react";

export type LatexPreviewModalProps = {
  identity: FileIdentity;
  latex: {
    opened: boolean;
    code: string;
    readOnly: boolean;
    saveDisabled: boolean;
    onClose: () => void;
    onChangeCode: (code: string) => void;
    onDownload: () => void;
    onSaveDraft: () => void;
    onSaveFinal: () => void;
  };
};

export function LatexPreviewModal({ identity, latex }: LatexPreviewModalProps) {
  return (
    <Modal
      opened={latex.opened}
      onClose={latex.onClose}
      title={
        <Group justify="space-between" w="100%">
          <Group gap="xs">
            <Text fw={600}>LaTeX Preview</Text>
            <Badge
              size="sm"
              variant="light"
              color="violet"
              style={{ textTransform: "none" }}
            >
              {identity.fileName}.{identity.language}.tex
            </Badge>
          </Group>

          <Tooltip label="Download .tex">
            <ActionIcon variant="light" onClick={latex.onDownload}>
              <Download size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      }
      size="xl"
      padding="lg"
    >
      <Textarea
        value={latex.code}
        onChange={(e) => latex.onChangeCode(e.currentTarget.value)}
        autosize
        minRows={25}
        readOnly={latex.readOnly}
        styles={{
          input: {
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.6,
            backgroundColor: "var(--mantine-color-gray-0)",
          },
        }}
      />
      <Group justify="flex-end" mt="md" gap="sm">
        <Button
          color="blue"
          disabled={latex.saveDisabled}
          onClick={latex.onSaveDraft}
        >
          Save
        </Button>
        <Button
          color="blue"
          disabled={latex.saveDisabled}
          onClick={latex.onSaveFinal}
        >
          Save & Finalize
        </Button>
      </Group>
    </Modal>
  );
}
