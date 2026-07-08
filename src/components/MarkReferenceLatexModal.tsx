import {
  ActionIcon,
  Badge,
  Group,
  Modal,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { Download } from "lucide-react";

type MarkReferenceLatexModalProps = {
  opened: boolean;
  code: string;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
};

export function MarkReferenceLatexModal({
  opened,
  code,
  fileName,
  onClose,
  onDownload,
}: MarkReferenceLatexModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group justify="space-between" w="100%">
          <Group gap="xs">
            <Text fw={600}>Mark Reference LaTeX</Text>
            <Badge
              size="sm"
              variant="light"
              color="violet"
              style={{ textTransform: "none" }}
            >
              {fileName}
            </Badge>
          </Group>

          <Tooltip label="Download .tex">
            <ActionIcon variant="light" onClick={onDownload}>
              <Download size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      }
      size="xl"
      padding="lg"
    >
      <Textarea
        value={code}
        readOnly
        autosize
        minRows={25}
        styles={{
          input: {
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 1.6,
            backgroundColor: "var(--mantine-color-gray-0)",
          },
        }}
      />
    </Modal>
  );
}
