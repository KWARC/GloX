import { Box, Divider, Paper, ScrollArea, Stack, Text } from "@mantine/core";
import { DocumentPage } from "generated/prisma/browser";

interface DocumentPagesPanelProps {
  pages: DocumentPage[];
  onSelection: () => void;
}

export function DocumentPagesPanel({
  pages,
  onSelection,
}: DocumentPagesPanelProps) {
  return (
    <Paper withBorder h="100%" radius="md">
      <ScrollArea h="100%" onMouseUp={onSelection}>
        <Stack p="lg" gap="lg">
          {pages.map((page) => (
            <Box key={page.id}>
              <Text size="xs" fw={700} c="dimmed" mb="xs" tt="uppercase">
                Page {page.pageNumber}
              </Text>

              <Text
                size="sm"
                lh={1.8}
                style={{
                  whiteSpace: "pre-wrap",
                  userSelect: "text",
                  cursor: "text",
                }}
                onMouseUp={onSelection}
              >
                {page.text}
              </Text>

              {page.id !== pages[pages.length - 1]?.id && <Divider mt="lg" />}
            </Box>
          ))}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
