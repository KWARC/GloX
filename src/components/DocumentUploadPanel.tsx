import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconFile,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { useRef, useState } from "react";

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function DocumentUploadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const {
    canUpload,
    error,
    existingDocumentId,
    file,
    filePath,
    futureRepo,
    language,
    loading,
    openExisting,
    selectFile,
    setFilePath,
    setFutureRepo,
    setLanguage,
    upload,
  } = useDocumentUpload();

  const handleIncomingFile = (candidate: File | null) => {
    if (!candidate) return;
    if (candidate.type && candidate.type !== "application/pdf") return;
    selectFile(candidate);
  };

  return (
    <Paper withBorder radius="lg" p="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={3}>Upload PDF</Title>
            <Text c="dimmed" size="sm">
              Drag and drop a PDF here or browse from your device.
            </Text>
          </Stack>
          <ThemeIcon
            size="xl"
            radius="md"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
          >
            <IconUpload size={20} />
          </ThemeIcon>
        </Group>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Upload failed"
            color="red"
            variant="light"
          >
            {error}
          </Alert>
        )}

        {existingDocumentId && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="This PDF already exists"
            color="yellow"
            variant="light"
          >
            <Stack gap="sm">
              <Text size="sm">
                This PDF has already been uploaded. Open the existing document
                instead of uploading it again.
              </Text>
              <Group>
                <Button variant="light" onClick={openExisting}>
                  Open Existing PDF
                </Button>
              </Group>
            </Stack>
          </Alert>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(event) => {
            handleIncomingFile(event.currentTarget.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />

        <Paper
          withBorder
          radius="lg"
          p="xl"
          onClick={() => !loading && inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!loading) setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!loading) {
              event.dataTransfer.dropEffect = "copy";
              setIsDragging(true);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (loading) return;
            handleIncomingFile(event.dataTransfer.files?.[0] ?? null);
          }}
          style={{
            cursor: loading ? "default" : "pointer",
            borderStyle: "dashed",
            borderWidth: 2,
            borderColor: isDragging
              ? "var(--mantine-color-blue-5)"
              : "var(--mantine-color-gray-4)",
            background: isDragging
              ? "var(--mantine-color-blue-0)"
              : "var(--mantine-color-gray-0)",
            transition: "background-color 120ms ease, border-color 120ms ease",
          }}
        >
          <Stack align="center" gap="sm">
            <ThemeIcon size={56} radius="xl" variant="light" color="blue">
              <IconFile size={28} />
            </ThemeIcon>
            <Stack gap={2} align="center">
              <Text fw={600}>Drop your PDF here</Text>
              <Text size="sm" c="dimmed">
                or click to browse
              </Text>
            </Stack>
          </Stack>
        </Paper>

        {file && !loading && (
          <Paper
            p="md"
            radius="md"
            withBorder
            style={{
              background:
                "linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-cyan-0) 100%)",
              borderColor: "var(--mantine-color-blue-3)",
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" style={{ minWidth: 0 }}>
                <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                  <IconFile size={18} />
                </ThemeIcon>
                <Stack gap={2} style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} lineClamp={1}>
                    {file.name}
                  </Text>
                  <Badge size="xs" variant="light" color="gray">
                    {formatFileSize(file.size)}
                  </Badge>
                </Stack>
              </Group>
              <ThemeIcon size="md" radius="xl" color="green" variant="light">
                <IconCheck size={14} />
              </ThemeIcon>
            </Group>
          </Paper>
        )}

        {file && !loading && (
          <Stack gap="sm">
            <TextInput
              label="Future Repo"
              placeholder="e.g. smglom/software"
              value={futureRepo}
              onChange={(event) => setFutureRepo(event.currentTarget.value)}
            />

            <TextInput
              label="File Path"
              placeholder="e.g. mod"
              value={filePath}
              onChange={(event) => setFilePath(event.currentTarget.value)}
            />

            <Select
              label="Language"
              value={language}
              onChange={(value) => setLanguage(value || "en")}
              data={[
                { value: "en", label: "English (en)" },
                { value: "de", label: "German (de)" },
              ]}
              allowDeselect={false}
            />
          </Stack>
        )}

        {loading && (
          <Stack gap="xs">
            <Progress value={100} animated color="blue" size="sm" radius="xl" />
            <Text size="xs" c="dimmed" ta="center">
              Uploading and processing your document…
            </Text>
          </Stack>
        )}

        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => selectFile(null)}
            disabled={!file || loading}
            leftSection={<IconX size={16} />}
          >
            Clear
          </Button>
          <Button
            onClick={upload}
            loading={loading}
            disabled={!canUpload}
            leftSection={<IconUpload size={16} />}
          >
            {loading ? "Uploading…" : "Upload"}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
