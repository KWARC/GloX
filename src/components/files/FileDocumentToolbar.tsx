import { MyDocument } from "@/queries/document";
import { Badge, Box, Group, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
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
      />
      <Text size={isMobile ? "md" : "sm"} fw={600} c="gray.7" style={{ flexShrink: 0 }}>
        {document.filename}
      </Text>
      <Badge
        size={isMobile ? "sm" : "xs"}
        variant="light"
        color="gray"
        style={{ flexShrink: 0 }}
      >
        {pages.length} {pages.length === 1 ? "page" : "pages"}
      </Badge>
      <Box style={{ flex: 1 }} />

      {llmButtons}
    </Group>
  );
}
