import { Paper, Stack, Text, Loader } from "@mantine/core";
import { useQuery as useRQ } from "@tanstack/react-query";
import { lookupDefinitions } from "@/serverFns/mathubDefinitionLookUp.server";

export type DefinitionResult = {
  uri: string;
  label: string;
};

type Props = {
  conceptUri: string;
  selection?: string;
  onSelect: (def: DefinitionResult) => void;
};

export function DefinitionLookupDialog({ conceptUri, onSelect }: Props) {
  const hasConcept = !!conceptUri?.trim();

  const { data, isLoading, error } = useRQ({
    queryKey: ["definition-lookup", conceptUri],
    enabled: hasConcept,
    queryFn: async () => {
      const results = await lookupDefinitions({
        data: { conceptUri } as any,
      });
      return results;
    },
  });

  if (!hasConcept) {
    return <Text size="sm">No concept selected.</Text>;
  }

  if (isLoading) return <Loader size="sm" />;
  if (error) return <Text c="red">Query failed</Text>;

  if (!data || data.length === 0) {
    return <Text size="sm">No MathHub definitions found.</Text>;
  }

  return (
    <Stack gap="xs">
      <Text size="sm">Select a definition:</Text>

      {data.map((uri: string) => (
        <Paper
          key={uri}
          withBorder
          p="xs"
          style={{ cursor: "pointer" }}
          onClick={() => onSelect({ uri, label: uri.split("/").pop() || uri })}
        >
          <Text fw={500} size="sm">
            {uri.split("/").pop() || uri}
          </Text>
          <Text size="xs" c="dimmed">
            {uri}
          </Text>
        </Paper>
      ))}
    </Stack>
  );
}
