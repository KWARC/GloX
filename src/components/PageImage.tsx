import { getPageImage } from "@/serverFns/pageImage.server";
import { Box, Image, Loader, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

interface PageImageProps {
  documentId: string;
  pageNumber: number;
}

export function PageImage({ documentId, pageNumber }: PageImageProps) {
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
          borderRadius: 6,
          border: "1px solid var(--mantine-color-gray-3)",
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
          borderRadius: 6,
        }}
      >
        <Text size="xs" c="red">
          Failed to load page image
        </Text>
      </Box>
    );
  }

  return (
    <Box
      style={{
        border: "1px solid var(--mantine-color-gray-3)",
        borderRadius: 6,
        padding: 4,
        backgroundColor: "black",
      }}
    >
      <Image
        src={`data:${data.mimeType};base64,${data.base64}`}
        alt={`Page ${pageNumber}`}
        radius="sm"
        style={{
          width: "100%",
          display: "block",
        }}
      />
    </Box>
  );
}
