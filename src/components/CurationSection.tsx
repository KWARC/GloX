import { CurationMarkReferenceBox } from "@/components/CurationMarkReferenceBox";
import { CurationPageSkeleton } from "@/components/PageSkeletons";
import { StexCuration } from "@/components/stex-curation/StexCuration";
import { FloDownBlockCurationStatus } from "@/routes/curation";
import { getFileIdentities } from "@/serverFns/latex.server";
import {
  deleteMarkReference,
  listMarkReferenceFiles,
} from "@/serverFns/markReference.server";
import {
  Box,
  Divider,
  Group,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Props = {
  curationLevel: FloDownBlockCurationStatus | null;
  setCurationLevel: (value: FloDownBlockCurationStatus | null) => void;
};

export function CurationSection({
  curationLevel,
  setCurationLevel,
}: Props) {
  const queryClient = useQueryClient();
  const { data: fileGroups = [], isLoading } = useQuery({
    queryKey: ["fileIdentities", curationLevel],
    queryFn: () =>
      getFileIdentities({
        data: {
          status: curationLevel ?? undefined,
        },
      }),
  });
  const { data: markReferenceFiles = [], isLoading: markReferencesLoading } =
    useQuery({
      queryKey: ["curation-mark-reference-files"],
      queryFn: () => listMarkReferenceFiles({ data: {} }),
    });
  const {
    mutateAsync: removeMarkReference,
    variables: deletingMarkReferenceId,
  } = useMutation({
    mutationFn: (referenceId: string) =>
      deleteMarkReference({ data: { id: referenceId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["curation-mark-reference-files"],
      });
    },
  });

  if (isLoading || markReferencesLoading) {
    return <CurationPageSkeleton />;
  }

  return (
    <Stack w="100%" gap="md">
      <Box>
        <Group justify="space-between" align="flex-end" mb="xs">
          <Stack gap={4}>
            <Title order={3} fw={700}>
              FTML Contents by File
            </Title>
            <Text size="sm" c="dimmed">
              Structured symbol declarations and contents grouped by file
            </Text>
          </Stack>

          <Select
            label="Filter by Content status"
            placeholder="All statuses"
            value={curationLevel}
            onChange={(value) =>
              setCurationLevel(value as FloDownBlockCurationStatus | null)
            }
            clearable
            data={[
              { value: "EXTRACTED", label: "Extracted" },
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
        <Divider />
      </Box>

      {!isLoading && fileGroups.length === 0 && (
        <Box
          py="lg"
          style={{
            textAlign: "center",
            borderRadius: 8,
            border: "1px dashed var(--mantine-color-gray-3)",
            backgroundColor: "var(--mantine-color-gray-0)",
          }}
        >
          <Text size="sm" c="dimmed" fw={500}>
            No extracted content found
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            Extract text from a document to get started
          </Text>
        </Box>
      )}

      <CurationMarkReferenceBox
        files={markReferenceFiles}
        deletingId={deletingMarkReferenceId ?? null}
        onDelete={async (referenceId) => {
          await removeMarkReference(referenceId);
        }}
      />

      {fileGroups.length > 0 && (
        <Table.ScrollContainer minWidth={1040}>
          <Table
            highlightOnHover
            withTableBorder
            verticalSpacing="xs"
            horizontalSpacing="sm"
            styles={{
              th: {
                paddingTop: 10,
                paddingBottom: 10,
                fontSize: "0.75rem",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              },
              td: {
                paddingTop: 10,
                paddingBottom: 10,
                verticalAlign: "middle",
              },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th w="62%">Content</Table.Th>
                <Table.Th w="18%">Declared Symbol</Table.Th>
                <Table.Th w="6%">Info</Table.Th>
                <Table.Th w="14%">Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {fileGroups.map((definition) => (
                <StexCuration
                  key={`${definition.futureRepo}-${definition.filePath}-${definition.fileName}-${definition.language}`}
                  identity={definition}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}
