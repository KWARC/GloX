import { MyDocument } from "@/queries/document";
import { Badge, Box, Group, Text } from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import { DocumentPage } from "generated/prisma/browser";
import { ReactNode } from "react";

export function FileDocumentToolbar({
  document,
  pages,
  llmButtons,
}: {
  document: MyDocument;
  pages: DocumentPage[];
  llmButtons: ReactNode;
}) {
  return (
    <Group
      px="md"
      py="sm"
      gap="xs"
      style={{
        borderBottom: "1px solid var(--mantine-color-gray-2)",
        flexWrap: "nowrap",
      }}
    >
      <IconFileText size={16} color="var(--mantine-color-blue-6)" />
      <Text size="sm" fw={600} c="gray.7" style={{ flexShrink: 0 }}>
        {document.filename}
      </Text>
      <Badge size="xs" variant="light" color="gray" style={{ flexShrink: 0 }}>
        {pages.length} {pages.length === 1 ? "page" : "pages"}
      </Badge>
      <Box style={{ flex: 1 }} />

      {llmButtons}
    </Group>
  );
}
