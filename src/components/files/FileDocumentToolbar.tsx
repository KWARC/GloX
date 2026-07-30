import { MyDocument } from "@/queries/document";
import { ActionIcon, Badge, Box, Group, Text, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconFileText, IconFolderSymlink } from "@tabler/icons-react";
import { DocumentPage } from "generated/prisma/browser";
import { ReactNode } from "react";

export function FileDocumentToolbar({
  document,
  pages,
  llmButtons,
  onMoveLocation,
}: {
  document: MyDocument;
  pages: DocumentPage[];
  llmButtons: ReactNode;
  onMoveLocation: () => void;
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <Group
      px={isMobile ? "lg" : "md"}
      py={isMobile ? "md" : "sm"}
      gap="xs"
      style={{
        borderBottom: "1px solid var(--mantine-color-gray-2)",
        flexWrap: "nowrap",
      }}
    >
      <IconFileText
        size={isMobile ? 18 : 16}
        color="var(--mantine-color-blue-6)"
        style={{ flexShrink: 0 }}
      />
      <Tooltip label={document.filename} openDelay={500} withArrow>
        <Text
          size={isMobile ? "md" : "sm"}
          fw={600}
          c="gray.7"
          truncate
          style={{ flex: "1 1 auto", minWidth: 0 }}
        >
          {document.filename}
        </Text>
      </Tooltip>
      <Badge
        size={isMobile ? "sm" : "xs"}
        variant="light"
        color="gray"
        style={{ flexShrink: 0 }}
      >
        {pages.length} {pages.length === 1 ? "page" : "pages"}
      </Badge>

      <Tooltip label="Move File location" withArrow>
        <ActionIcon
          variant="subtle"
          color="blue"
          onClick={onMoveLocation}
          style={{ flexShrink: 0 }}
        >
          <IconFolderSymlink size={16} />
        </ActionIcon>
      </Tooltip>

      <Box style={{ display: "flex", flexShrink: 0 }}>{llmButtons}</Box>
    </Group>
  );
}
