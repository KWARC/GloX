import {
  Box,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { DocumentPage } from "generated/prisma/browser";
import { useState } from "react";
import { PageImage } from "./PageImage";

interface DocumentPagesPanelProps {
  documentId: string;
  pages: DocumentPage[];
  onSelection: (pageId: string) => void;
}

export function DocumentPagesPanel({
  documentId,
  pages,
  onSelection,
}: DocumentPagesPanelProps) {
  const [collapsedPages, setCollapsedPages] = useState<Record<string, boolean>>(
    {},
  );

  function togglePage(pageId: string) {
    setCollapsedPages((prev) => ({
      ...prev,
      [pageId]: !prev[pageId],
    }));
  }

  return (
    <Paper withBorder h="100%" radius="md">
      <ScrollArea h="100%">
        <Stack p="lg" gap="lg">
          {pages.map((page) => {
            const isCollapsed = collapsedPages[page.id];

            return (
              <Box key={page.id}>
                <Group justify="space-between" align="center" mb="xs">
                  <Text size="xs" fw={700} c="dark" tt="uppercase">
                    Page {page.pageNumber}
                  </Text>

                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => togglePage(page.id)}
                  >
                    {isCollapsed ? "Show Image" : "Hide Image"}
                  </Button>
                </Group>

                <Text
                  size="sm"
                  lh={1.8}
                  mt="sm"
                  style={{
                    whiteSpace: "pre-wrap",
                    userSelect: "text",
                    cursor: "text",
                  }}
                  onMouseUp={() => onSelection(page.id)}
                >
                  {page.text}
                </Text>

                {!isCollapsed && (
                  <Box mt="sm">
                    <PageImage
                      documentId={documentId}
                      pageNumber={page.pageNumber}
                    />
                  </Box>
                )}

                {page.id !== pages[pages.length - 1]?.id && <Divider mt="lg" />}
              </Box>
            );
          })}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
