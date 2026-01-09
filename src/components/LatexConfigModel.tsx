import { ExtractedItem } from "@/server/text-selection";
import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { useState } from "react";

interface LatexConfigModelProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (config: {
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  }) => void;
  extracts: ExtractedItem[];
}

interface ConfigOption {
  value: string;
  label: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
}

export function LatexConfigModel({
  opened,
  onClose,
  onSubmit,
  extracts,
}: LatexConfigModelProps) {
  const configOptions: ConfigOption[] = [];
  const seen = new Set<string>();

  extracts.forEach((extract) => {
    const key = `${extract.futureRepo}/${extract.filePath}/${extract.fileName}/${extract.language}`;
    if (!seen.has(key)) {
      seen.add(key);
      configOptions.push({
        value: key,
        label: key,
        futureRepo: extract.futureRepo,
        filePath: extract.filePath,
        fileName: extract.fileName,
        language: extract.language,
      });
    }
  });

  const [selectedConfig, setSelectedConfig] = useState<string | null>(
    configOptions[0]?.value || null
  );

  const handleSubmit = () => {
    if (!selectedConfig) return;

    const config = configOptions.find((opt) => opt.value === selectedConfig);
    if (!config) return;

    onSubmit({
      futureRepo: config.futureRepo,
      filePath: config.filePath,
      fileName: config.fileName,
      language: config.language,
    });
  };

  if (configOptions.length === 0) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title="Configure LaTeX Generation"
        size="md"
      >
        <Stack gap="md">
          <Text c="dimmed">
            No extracted text found. Please extract some text first.
          </Text>
          <Group justify="flex-end">
            <Button onClick={onClose}>Close</Button>
          </Group>
        </Stack>
      </Modal>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Configure LaTeX Generation"
      size="md"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Select a configuration from your extracted text:
        </Text>

        <Select
          label="Configuration"
          placeholder="Select a configuration"
          data={configOptions}
          value={selectedConfig}
          onChange={setSelectedConfig}
          searchable
          required
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedConfig}>
            Generate LaTeX
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
