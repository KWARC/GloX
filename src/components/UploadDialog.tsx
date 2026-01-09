import { uploadPdf } from "@/serverFns/upload.server";
import {
  Button,
  FileInput,
  Modal,
  Stack,
  Text,
  Group,
  Paper,
  ThemeIcon,
  Progress,
  Alert,
} from "@mantine/core";
import {
  IconUpload,
  IconFile,
  IconCheck,
  IconAlertCircle,
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadPdf({ data: formData } as any);
      console.log(result);

      if (
        result?.documentId &&
        (result.status === "OK" || result.status === "DUPLICATE")
      ) {
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        onClose();
        setFile(null);
        navigate({
          to: "/my-files/$documentId",
          params: { documentId: result.documentId },
        });
      } else {
        setError("Upload failed. Please try again.");
        setFile(null);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setError("An error occurred during upload. Please try again.");
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

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <ThemeIcon size="lg" radius="md" variant="light" color="blue">
            <IconUpload size={20} />
          </ThemeIcon>
          <Text fw={600} size="lg">
            Upload PDF Document
          </Text>
        </Group>
      }
      centered
      size="md"
      padding="xl"
      radius="md"
      styles={{
        header: {
          paddingBottom: 16,
        },
        body: {
          paddingTop: 0,
        },
      }}
    >
      <Stack gap="lg">
        <Text size="sm" c="dimmed">
          Upload a PDF file to extract and analyze its contents. Supported
          formats: PDF files up to 50MB.
        </Text>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Upload Error"
            color="red"
            variant="light"
            radius="md"
          >
            {error}
          </Alert>
        )}

        <FileInput
          label="Select PDF File"
          placeholder="Click to browse files"
          accept="application/pdf"
          value={file}
          onChange={setFile}
          leftSection={<IconFile size={18} />}
          size="md"
          styles={{
            input: {
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: "var(--mantine-color-blue-5)",
              },
            },
          }}
        />

        {file && !loading && (
          <Paper
            p="md"
            radius="md"
            withBorder
            style={{
              background:
                "linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-blue-1) 100%)",
              borderColor: "var(--mantine-color-blue-3)",
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm">
                <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                  <IconFile size={20} />
                </ThemeIcon>
                <div>
                  <Text size="sm" fw={600} lineClamp={1}>
                    {file.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatFileSize(file.size)}
                  </Text>
                </div>
              </Group>
              <ThemeIcon size="md" radius="xl" color="green" variant="light">
                <IconCheck size={16} />
              </ThemeIcon>
            </Group>
          </Paper>
        )}

        {loading && (
          <Stack gap="xs">
            <Progress value={100} animated color="blue" size="sm" radius="xl" />
            <Text size="xs" c="dimmed" ta="center">
              Uploading and processing your document...
            </Text>
          </Stack>
        )}

        <Group justify="flex-end" mt="md">
          <Button
            variant="subtle"
            color="gray"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            loading={loading}
            disabled={!file}
            leftSection={<IconUpload size={18} />}
            size="md"
            style={{
              transition: "all 0.2s ease",
            }}
          >
            {loading ? "Uploading..." : "Upload Document"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
