import { useState } from 'react'
import { Modal, FileInput, Button, Stack, Text } from '@mantine/core'
import { uploadPdf } from '../routes/upload.server'

interface Props {
  opened: boolean
  onClose: () => void
}

export default function UploadDialog({ opened, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

const handleUpload = async () => {
  if (!file) return

  setLoading(true)

  try {
    // ✅ pass File directly
    const result = await uploadPdf(file)

    console.log(result)
    onClose()
    setFile(null)
  } finally {
    setLoading(false)
  }
}



  return (
    <Modal opened={opened} onClose={onClose} title="Upload PDF" centered>
      <Stack>
        <Text size="sm" c="dimmed">
          Upload a PDF file to begin extraction.
        </Text>

        <FileInput
          label="PDF file"
          accept="application/pdf"
          value={file}
          onChange={setFile}
        />

        <Button onClick={handleUpload} loading={loading} disabled={!file}>
          Upload
        </Button>
      </Stack>
    </Modal>
  )
}
