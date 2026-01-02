import { useState } from 'react'
import {
  Modal,
  FileInput,
  Button,
  Stack,
  Text,
} from '@mantine/core'

interface UploadPdfDialogProps {
  opened: boolean
  onClose: () => void
  onUpload?: (file: File) => void
}

export default function UploadDialog({
  opened,
  onClose,
  onUpload,
}: UploadPdfDialogProps) {
  const [file, setFile] = useState<File | null>(null)

  const handleUpload = () => {
    if (!file) return
    onUpload?.(file)
    setFile(null)
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Upload PDF"
      centered
    >
      <Stack>
        <Text size="sm" c="dimmed">
          Upload a PDF file to extract text and begin curation.
        </Text>

        <FileInput
          label="PDF file"
          placeholder="Select a PDF file"
          accept="application/pdf"
          value={file}
          onChange={setFile}
          clearable
        />

        <Button
          onClick={handleUpload}
          disabled={!file}
        >
          Upload
        </Button>
      </Stack>
    </Modal>
  )
}
