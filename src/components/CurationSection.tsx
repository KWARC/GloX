import { getFileIdentities } from "@/serverFns/latex.server";
import {
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
  curationLevel: string | null;
  setCurationLevel: (value: string | null) => void;
};

export function CurationSection({ curationLevel, setCurationLevel }: Props) {
  const { data: fileGroups = [], isLoading } = useQuery({
    queryKey: ["fileIdentities"],
    queryFn: getFileIdentities,
  });

  return (
    <Stack w="100%" maw={1200} gap="lg">
      <Select
        label="Curation Level"
        value={curationLevel}
        onChange={setCurationLevel}
        data={[
          { value: "EXTRACTED", label: "EXTRACTED" },
          { value: "SNIFIED", label: "sn-ified" },
          { value: "FINALIZED", label: "finalized in file" },
          { value: "SUBMITTED", label: "submitted to mathhub" },
        ]}
        w={250}
      />
      <Group justify="space-between" align="center">
        <Stack gap={4}>
          <Title order={3}>FTML Definitions by File</Title>
          <Text size="sm" c="dimmed">
            Structured symbol declarations and definitions grouped by file
          </Text>
        </Stack>
        {isLoading && <Loader size="sm" />}
      </Group>

      {!isLoading && fileGroups.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">
          No FTML definitions found
        </Text>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
        {fileGroups.map((definition) => (
          <StexCuration
            key={`${definition.futureRepo}-${definition.filePath}-${definition.fileName}-${definition.language}`}
            identity={definition}
          />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
