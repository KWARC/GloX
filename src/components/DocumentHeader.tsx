import { ValidationErrors } from "@/server/text-selection";
import { Group, Paper, Text, TextInput } from "@mantine/core";
interface DocumentHeaderProps {
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  disabled?: boolean;
  onFutureRepoChange: (value: string) => void;
  onFilePathChange: (value: string) => void;
  onFileNameChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  errors: ValidationErrors;
}

export function DocumentHeader({
  futureRepo,
  filePath,
  fileName,
  language,
  disabled,
  onFutureRepoChange,
  onFilePathChange,
  onFileNameChange,
  onLanguageChange,
  errors,
}: DocumentHeaderProps) {
  return (
    <Paper withBorder p="sm" mb="md" bg="gray.0">
      <Group gap="lg" align="flex-end">
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
            disabled={disabled}
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
            disabled={disabled}
            styles={{ input: { fontWeight: 500 } }}
          />
        </Group>

        <Group gap="xs">
          <Text size="sm" fw={600} c="gray.7">
            File Name
          </Text>
          <TextInput
            value={fileName}
            onChange={(e) => onFileNameChange(e.currentTarget.value)}
            placeholder="e.g. derivative-rules"
            w={200}
            size="sm"
            error={errors.fileName}
            disabled={disabled}
            styles={{ input: { fontWeight: 500 } }}
          />
        </Group>

        <Group gap="xs">
          <Text size="sm" fw={600} c="gray.7">
            Language
          </Text>
          <TextInput
            value={language}
            onChange={(e) => onLanguageChange(e.currentTarget.value)}
            placeholder="e.g. en, de, fr"
            w={120}
            size="sm"
            error={errors.language}
            disabled={disabled}
            styles={{ input: { fontWeight: 500 } }}
          />
        </Group>
      </Group>
    </Paper>
  );
}
