import {
  Box,
  Container,
  Group,
  Paper,
  Skeleton,
  Stack,
  VisuallyHidden,
} from "@mantine/core";

const rows = Array.from({ length: 6 });

export function DocumentsTableSkeleton() {
  return (
    <Stack gap="md" role="status" aria-live="polite" aria-busy="true">
      <VisuallyHidden>Loading files</VisuallyHidden>
      <Group justify="space-between" align="flex-end">
        <Skeleton h={30} w={190} />
        <Group>
          <Skeleton h={56} w={280} radius="sm" />
          <Skeleton h={56} w={220} radius="sm" />
        </Group>
      </Group>
      <Paper withBorder radius="sm" style={{ overflow: "hidden" }}>
        <Group p="md" wrap="nowrap">
          {[30, 14, 14, 10, 10, 12, 10].map((width, index) => (
            <Skeleton key={index} h={12} w={`${width}%`} />
          ))}
        </Group>
        {rows.map((_, index) => (
          <Group
            key={index}
            p="md"
            wrap="nowrap"
            style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
          >
            <Stack gap={7} w="30%">
              <Skeleton h={14} w={`${65 + (index % 3) * 10}%`} />
              <Skeleton h={9} w="86%" />
            </Stack>
            <Skeleton h={22} w="14%" radius="xl" />
            <Skeleton h={22} w="14%" radius="xl" />
            <Skeleton h={22} w="10%" radius="xl" />
            <Skeleton h={12} w="10%" />
            <Skeleton h={12} w="12%" />
            <Group w="10%" justify="center">
              <Skeleton circle h={26} />
              <Skeleton circle h={26} />
            </Group>
          </Group>
        ))}
      </Paper>
    </Stack>
  );
}

export function CurationPageSkeleton() {
  return (
    <Box p="md" role="status" aria-live="polite" aria-busy="true">
      <VisuallyHidden>Loading curation</VisuallyHidden>
      <Stack gap="md" maw={1400} mx="auto">
        <Group justify="space-between" align="flex-end">
          <Stack gap="xs">
            <Skeleton h={24} w={240} />
            <Skeleton h={11} w={340} />
          </Stack>
          <Group>
            <Skeleton h={56} w={220} radius="sm" />
            <Skeleton h={56} w={240} radius="sm" />
          </Group>
        </Group>
        <Skeleton h={1} />
        <Paper withBorder radius="sm" p="md">
          <Stack gap="md">
            <Skeleton h={18} w={210} />
            {rows.slice(0, 5).map((_, index) => (
              <Group key={index} wrap="nowrap">
                <Stack gap={7} w="62%">
                  <Skeleton h={14} w={`${58 + index * 6}%`} />
                  <Skeleton h={9} w="92%" />
                </Stack>
                <Skeleton h={14} w="18%" />
                <Skeleton circle h={24} />
                <Skeleton h={24} w="14%" radius="xl" />
              </Group>
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}

export function ProfilePageSkeleton() {
  return (
    <Container
      size="sm"
      mt="xl"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <VisuallyHidden>Loading profile</VisuallyHidden>
      <Stack gap="md">
        <Paper shadow="sm" p="xl" withBorder>
          <Stack gap="lg">
            <Group justify="space-between">
              <Skeleton h={30} w={120} />
              <Skeleton h={34} w={112} radius="sm" />
            </Group>
            <Skeleton h={1} />
            <Group>
              <Skeleton circle h={80} />
              <Stack gap="sm">
                <Skeleton h={22} w={180} />
                <Skeleton h={12} w={230} />
              </Stack>
            </Group>
            <Skeleton h={1} />
            {rows.slice(0, 4).map((_, index) => (
              <Paper key={index} p="md" withBorder>
                <Group justify="space-between">
                  <Skeleton h={13} w={120} />
                  <Skeleton h={13} w={150 - index * 12} />
                </Group>
              </Paper>
            ))}
          </Stack>
        </Paper>
        <Paper shadow="sm" p="xl" withBorder>
          <Stack gap="md">
            <Skeleton h={22} w={190} />
            <Skeleton h={1} />
            <Skeleton h={14} />
            <Skeleton h={14} w="82%" />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

export function DeduplicationPageSkeleton() {
  return (
    <Box p="lg" role="status" aria-live="polite" aria-busy="true">
      <VisuallyHidden>Loading deduplication</VisuallyHidden>
      <Stack gap="md">
        <Skeleton h={32} w={210} />
        {rows.slice(0, 4).map((_, index) => (
          <Paper key={index} withBorder p="lg" radius="md">
            <Group align="flex-start" justify="space-between">
              <Stack w="40%" gap="sm">
                <Skeleton h={17} w={`${45 + index * 8}%`} />
                <Skeleton h={74} />
              </Stack>
              <Stack w="55%" gap="sm">
                <Skeleton h={16} w="68%" />
                <Skeleton h={10} />
                <Skeleton h={10} w="88%" />
                <Skeleton h={30} w={140} radius="sm" />
              </Stack>
            </Group>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
