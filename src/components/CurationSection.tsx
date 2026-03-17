import { DefinitionStatus } from "@/routes/curation";
import { getFileIdentities } from "@/serverFns/latex.server";
import {
  Box,
  Divider,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { StexCuration } from "./StexCuration";

type Props = {
  curationLevel: DefinitionStatus | null;
  setCurationLevel: (value: DefinitionStatus | null) => void;
};

export function CurationSection({ curationLevel, setCurationLevel }: Props) {
  const { data: fileGroups = [], isLoading } = useQuery({
    queryKey: ["fileIdentities", curationLevel],
    queryFn: () =>
      getFileIdentities({
        data: {
          status: curationLevel ?? undefined,
        },
      }),
  });

  return (
    <Stack w="100%" maw={1200} gap="xl">
      <Box>
        <Group justify="space-between" align="flex-end" mb="xs">
          <Stack gap={4}>
            <Title order={3} fw={700}>
              FTML Definitions by File
            </Title>
            <Text size="sm" c="dimmed">
              Structured symbol declarations and definitions grouped by file
            </Text>
          </Stack>

          <Group gap="sm" align="flex-end">
            {isLoading && <Loader size="sm" color="blue" />}
            <Select
              label="Filter by Definition status"
              placeholder="All statuses"
              value={curationLevel}
              onChange={(value) =>
                setCurationLevel(value as DefinitionStatus | null)
              }
              clearable
              data={[
                { value: "EXTRACTED", label: "Extracted" },
                // { value: "sTeX Modified", label: "sTeX Modified" },

                { value: "FINALIZED_IN_FILE", label: " Finalized " },
                {
                  value: "SUBMITTED_TO_MATHHUB",
                  label: "Submitted to MathHub",
                },
                { value: "DISCARDED", label: "Discard" },
              ]}
              w={220}
              size="sm"
              styles={{
                label: { fontWeight: 500, marginBottom: 4 },
              }}
            />
          </Group>
        </Group>
        <Divider />
      </Box>

      {!isLoading && fileGroups.length === 0 && (
        <Box
          py="xl"
          style={{
            textAlign: "center",
            borderRadius: 8,
            border: "1px dashed var(--mantine-color-gray-3)",
            backgroundColor: "var(--mantine-color-gray-0)",
          }}
        >
          <Text size="sm" c="dimmed" fw={500}>
            No FTML definitions found
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Extract text from a document to get started
          </Text>
        </Box>
      )}

      {fileGroups.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {fileGroups.map((definition) => (
            <StexCuration
              key={`${definition.futureRepo}-${definition.filePath}-${definition.fileName}-${definition.language}`}
              identity={definition}
            />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
