import { ExtractedItem } from "@/server/text-selection";
import { Button, Group, Modal, Select, Stack, Text, Badge, Box } from "@mantine/core";
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

  const selectedConfigData = configOptions.find((opt) => opt.value === selectedConfig);

  if (configOptions.length === 0) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title={
          <Group gap="xs">
            <Text fw={600} size="lg">Configure LaTeX Generation</Text>
          </Group>
        }
        size="md"
        centered
        padding="lg"
      >
        <Stack gap="lg">
          <Box
            p="xl"
            style={{
              backgroundColor: "var(--mantine-color-gray-0)",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <Text size="lg" fw={500} c="gray.7" mb="xs">
              No Extracted Text Found
            </Text>
            <Text size="sm" c="dimmed">
              Please extract some text first before generating LaTeX.
            </Text>
          </Box>
          
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text fw={600} size="lg">Configure LaTeX Generation</Text>
          <Badge size="sm" color="blue" variant="light">
            {configOptions.length} {configOptions.length === 1 ? 'option' : 'options'}
          </Badge>
        </Group>
      }
      size="md"
      centered
      padding="lg"
    >
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          Select a configuration from your extracted text to generate LaTeX output.
        </Text>

        <Select
          label="Configuration"
          placeholder="Select a configuration"
          data={configOptions}
          value={selectedConfig}
          onChange={setSelectedConfig}
          searchable
          required
          size="sm"
          styles={{
            input: {
              fontFamily: "monospace",
              fontSize: "0.85rem",
            },
          }}
        />

        {selectedConfigData && (
          <Box
            p="md"
            style={{
              backgroundColor: "var(--mantine-color-gray-0)",
              borderRadius: "8px",
              border: "1px solid var(--mantine-color-gray-2)",
            }}
          >
            <Text size="xs" fw={600} c="gray.7" mb="sm" tt="uppercase">
              Selected Configuration
            </Text>
            <Stack gap="xs">
              <Group gap="xs">
                <Text size="xs" c="dimmed" w={80}>Repository:</Text>
                <Text size="xs" fw={500} ff="monospace">{selectedConfigData.futureRepo}</Text>
              </Group>
              <Group gap="xs">
                <Text size="xs" c="dimmed" w={80}>File Path:</Text>
                <Text size="xs" fw={500} ff="monospace">{selectedConfigData.filePath}</Text>
              </Group>
              <Group gap="xs">
                <Text size="xs" c="dimmed" w={80}>File Name:</Text>
                <Text size="xs" fw={500} ff="monospace">{selectedConfigData.fileName}</Text>
              </Group>
              <Group gap="xs">
                <Text size="xs" c="dimmed" w={80}>Language:</Text>
                <Badge size="xs" variant="light" color="teal">
                  {selectedConfigData.language}
                </Badge>
              </Group>
            </Stack>
          </Box>
        )}

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