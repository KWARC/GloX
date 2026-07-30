import {
  Box,
  Flex,
  Group,
  Paper,
  Skeleton,
  Stack,
  VisuallyHidden,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

type FileDocumentSkeletonProps = {
  filename?: string;
};

export function FileDocumentSkeleton({ filename }: FileDocumentSkeletonProps) {
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const loadingLabel = filename ? `Opening ${filename}` : "Loading document";

  return (
    <Box
      h="100%"
      p={isTablet ? "md" : "lg"}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <VisuallyHidden>{loadingLabel}</VisuallyHidden>

      <Flex
        gap={isTablet ? "md" : "lg"}
        h="100%"
        direction={isTablet ? "column" : "row"}
      >
        <Paper
          flex={isTablet ? undefined : 1}
          h={isTablet ? "50%" : undefined}
          withBorder
          radius="md"
          style={{ overflow: "hidden" }}
        >
          <Group
            px="md"
            py="sm"
            gap="xs"
            wrap="nowrap"
            style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
          >
            <Skeleton circle h={18} />
            <Skeleton h={14} w="36%" />
            <Skeleton h={20} w={64} ml="auto" radius="xl" />
            <Skeleton circle h={28} />
            <Skeleton h={28} w={112} radius="sm" />
          </Group>

          <Box p="lg" h="calc(100% - 49px)" bg="gray.0">
            <Skeleton h="100%" maw={620} mx="auto" radius="sm">
              <Stack gap="md" p="xl">
                <Skeleton h={18} w="58%" />
                <Skeleton h={10} />
                <Skeleton h={10} />
                <Skeleton h={10} w="92%" />
                <Skeleton h={10} />
                <Skeleton h={10} w="76%" />
                <Skeleton h={120} mt="md" />
                <Skeleton h={10} />
                <Skeleton h={10} w="88%" />
              </Stack>
            </Skeleton>
          </Box>
        </Paper>

        <Paper
          w={isTablet ? undefined : 440}
          h={isTablet ? "50%" : undefined}
          withBorder
          radius="md"
          style={{ overflow: "hidden" }}
        >
          <Group
            px="md"
            py="sm"
            gap="xs"
            wrap="nowrap"
            style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
          >
            <Skeleton circle h={18} />
            <Skeleton h={14} w={132} />
            <Skeleton h={24} w={58} ml="auto" radius="sm" />
            <Skeleton circle h={28} />
          </Group>

          <Stack p="md" gap="md">
            {[72, 88, 64, 80].map((width, index) => (
              <Paper key={index} withBorder radius="sm" p="md">
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Skeleton h={14} w={`${width}%`} />
                    <Skeleton circle h={22} />
                  </Group>
                  <Skeleton h={9} />
                  <Skeleton h={9} w="84%" />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      </Flex>
    </Box>
  );
}
