import { FileIdentity } from "@/serverFns/latex.server";
import { ActionIcon, Box, Button, Group, Text, Tooltip } from "@mantine/core";
import { FolderSymlink } from "lucide-react";

export type StexCurationFooterProps = {
  identity: FileIdentity;
  actions: {
    onOpenMetadataForIdentity: () => void;
    onOpenLatexPreview: () => void;
    onGoToSource: () => void;
  };
};

export function StexCurationFooter({
  identity,
  actions,
}: StexCurationFooterProps) {
  return (
    <Box px={2} pt={4}>
      <Group justify="space-between" align="center">
        <Group
          gap={6}
          wrap="nowrap"
          style={{
            cursor: "pointer",
            minWidth: 0,
            flex: 1,
            overflow: "hidden",
          }}
        >
          <Tooltip label="Move file path" withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={actions.onOpenMetadataForIdentity}
            >
              <FolderSymlink size={14} />
            </ActionIcon>
          </Tooltip>

          <Text size="10px" c="dimmed" ff="monospace" truncate>
            {[
              identity.futureRepo,
              identity.filePath,
              identity.fileName,
              identity.language,
            ]
              .filter(Boolean)

              .map((part) => `[${part}]`)
              .join(" ")}
          </Text>
        </Group>

        <Group gap="xs">
          <Tooltip label="Preview sTeX" withArrow>
            <Button
              size="xs"
              variant="subtle"
              color="blue"
              onClick={actions.onOpenLatexPreview}
            >
              LaTeX
            </Button>
          </Tooltip>

          <Button size="xs" variant="light" onClick={actions.onGoToSource}>
            Go to Source
          </Button>
        </Group>
      </Group>
    </Box>
  );
}
