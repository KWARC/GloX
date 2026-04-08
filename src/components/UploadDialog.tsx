import { uploadPdf } from "@/serverFns/upload.server";
import {
  Alert,
  Badge,
  Button,
  Divider,
  FileInput,
  Group,
  Modal,
  Paper,
  Progress,
  Select,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconFile,
  IconUpload,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

interface Props {
  opened: boolean;
  onClose: () => void;
}

export default function UploadDialog({ opened, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [futureRepo, setFutureRepo] = useState("");
  const [filePath, setFilePath] = useState("");
  const [language, setLanguage] = useState("en");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("futureRepo", futureRepo);
      formData.append("filePath", filePath);
      formData.append("language", language);

      const result = await uploadPdf({ data: formData });

      if (
        result?.documentId &&
        (result.status === "OK" || result.status === "DUPLICATE")
      ) {
        queryClient.invalidateQueries({ queryKey: ["documents"] });

        onClose();
        setFile(null);

        navigate({
          to: "/files/$documentId",
          params: { documentId: result.documentId },
        });
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
      setError("An error occurred during upload.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFile(null);
      setError(null);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const canUpload =
    !loading && !!file && !!futureRepo && !!filePath && !!language;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="sm">
          <ThemeIcon
            size="lg"
            radius="md"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
          >
            <IconUpload size={18} />
          </ThemeIcon>
          <Stack gap={0}>
            <Text fw={700} size="md" lh={1.2}>
              Upload PDF
            </Text>
            <Text size="xs" c="dimmed" fw={400}>
              Extract and annotate document content
            </Text>
          </Stack>
        </Group>
      }
      centered
      size="md"
      padding="xl"
      radius="md"
    >
      <Stack gap="lg">
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Upload failed"
            color="red"
            variant="light"
            radius="md"
          >
            {error}
          </Alert>
        )}

        <FileInput
          label="PDF File"
          description="Only PDF files are accepted."
          placeholder="Click to browse…"
          accept="application/pdf"
          value={file}
          onChange={setFile}
          leftSection={<IconFile size={16} />}
          radius="md"
          disabled={loading}
        />

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
          <>
            <Divider label="File metadata" labelPosition="left" />

            <Stack gap="sm">
              <TextInput
                label="Future Repo"
                placeholder="e.g. smglom/software"
                value={futureRepo}
                onChange={(e) => setFutureRepo(e.currentTarget.value)}
                radius="md"
              />

              <TextInput
                label="File Path"
                placeholder="e.g. mod"
                value={filePath}
                onChange={(e) => setFilePath(e.currentTarget.value)}
                radius="md"
              />

              <Select
                label="Language"
                value={language}
                onChange={(v) => setLanguage(v || "en")}
                data={[
                  { value: "en", label: "English (en)" },
                  { value: "de", label: "German (de)" },
                ]}
                radius="md"
                allowDeselect={false}
              />
            </Stack>
          </>
        )}

        {loading && (
          <Stack gap="xs">
            <Progress value={100} animated color="blue" size="sm" radius="xl" />
            <Text size="xs" c="dimmed" ta="center">
              Uploading and processing your document…
            </Text>
          </Stack>
        )}

        <Group justify="flex-end" gap="sm" mt={4}>
          <Button variant="default" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            loading={loading}
            disabled={!canUpload}
            leftSection={<IconUpload size={16} />}
          >
            {loading ? "Uploading…" : "Upload"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
