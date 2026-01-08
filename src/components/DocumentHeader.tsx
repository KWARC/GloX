import { ValidationErrors } from "@/server/text-selection";
import { Group, Paper, Text, TextInput } from "@mantine/core";
interface DocumentHeaderProps {
  futureRepo: string;
  filePath: string;
  onFutureRepoChange: (value: string) => void;
  onFilePathChange: (value: string) => void;
  errors: ValidationErrors;
}

export function DocumentHeader({
  futureRepo,
  filePath,
  onFutureRepoChange,
  onFilePathChange,
  errors,
}: DocumentHeaderProps) {
  return (
    <Paper withBorder p="sm" mb="md" bg="gray.0">
      <Group gap="lg">
        <Group gap="xs">
          <Text size="sm" fw={600} c="gray.7">
            Future Repo
          </Text>
          <TextInput
            value={futureRepo}
            onChange={(e) => onFutureRepoChange(e.currentTarget.value)}
            w={200}
            size="sm"
            error={errors.futureRepo}
            styles={{ input: { fontWeight: 500 } }}
          />
        </Group>

        <Group gap="xs">
          <Text size="sm" fw={600} c="gray.7">
            File Path
          </Text>
          <TextInput
            value={filePath}
            onChange={(e) => onFilePathChange(e.currentTarget.value)}
            placeholder="e.g. derivative"
            w={200}
            size="sm"
            error={errors.filePath}
            styles={{ input: { fontWeight: 500 } }}
          />
        </Group>
      </Group>
    </Paper>
  );
}
