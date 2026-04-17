import { getPageImage } from "@/serverFns/pageImage.server";
import {
  Box,
  Divider,
  Image,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { DocumentPage } from "generated/prisma/browser";

interface DocumentPagesPanelProps {
  documentId: string;
  pages: DocumentPage[];
  onSelection: (pageId: string) => void;
}

interface PageImageProps {
  documentId: string;
  pageNumber: number;
}

function PageImage({ documentId, pageNumber }: PageImageProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["page-image", documentId, pageNumber],
    queryFn: () =>
      getPageImage({
        data: { documentId, pageNumber },
      }),
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <Box
        style={{
          height: 300,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--mantine-color-gray-1)",
          borderRadius: 4,
        }}
      >
        <Loader size="sm" />
      </Box>
    );
  }

  if (isError || !data) {
    return (
      <Box
        style={{
          height: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--mantine-color-red-0)",
          border: "1px solid var(--mantine-color-red-3)",
          borderRadius: 4,
        }}
      >
        <Text size="xs" c="red">
          Failed to load page image
        </Text>
      </Box>
    );
  }

  return (
    <Image
      src={`data:${data.mimeType};base64,${data.base64}`}
      alt={`Page ${pageNumber}`}
      radius="sm"
      style={{
        width: "100%",
        height: "90%",
        display: "block",
        border: "1px solid var(--mantine-color-gray-2)",
      }}
    />
  );
}

export function DocumentPagesPanel({
  documentId,
  pages,
  onSelection,
}: DocumentPagesPanelProps) {
  return (
    <Paper withBorder h="100%" radius="md">
      <ScrollArea h="100%">
        <Stack p="lg" gap="lg">
          {pages.map((page) => (
            <Box key={page.id}>
              <Text size="xs" fw={700} c="dark" mb="xs" tt="uppercase">
                Page {page.pageNumber}
              </Text>
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
              <PageImage documentId={documentId} pageNumber={page.pageNumber} />
              {page.id !== pages[pages.length - 1]?.id && <Divider mt="lg" />}
            </Box>
          ))}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
