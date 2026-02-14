import { getFileIdentities } from "@/serverFns/latex.server";
import { Group, Loader, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { StexCuration } from "./StexCuration";

export function CurationSection() {
  const { data: identities = [], isLoading } = useQuery({
    queryKey: ["fileIdentities"],
    queryFn: getFileIdentities,
  });

  return (
    <Stack w="100%" maw={1200} gap="lg">
      <Group justify="space-between" align="center">
        <Stack gap={4}>
          <Title order={3}>FTML Definitions by File</Title>
          <Text size="sm" c="dimmed">
            Structured symbol declarations and definitions grouped by file
          </Text>
        </Stack>
        {isLoading && <Loader size="sm" />}
      </Group>

      {!isLoading && identities.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          No FTML definitions found
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {identities.map((identity) => (
          <StexCuration
            key={`${identity.futureRepo}-${identity.filePath}-${identity.fileName}-${identity.language}`}
            identity={identity}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
