import { createFileRoute } from '@tanstack/react-router'
import { Stack, Title, Text, Button } from '@mantine/core'
import { useState } from 'react'
import UploadDialog from '@/components/UploadDialog'


export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const [opened, setOpened] = useState(false)

  return (
    <>
      <Stack align="center" justify="center" mih="100%">
        <Title order={1}>GloX</Title>
        <Text c="dimmed">
          Knowledge curation from PDFs with OCR and structured definitions.
        </Text>
        <Button onClick={() => setOpened(true)}>
          Upload PDF
        </Button>
      </Stack>

      <UploadDialog
        opened={opened}
        onClose={() => setOpened(false)}
        onUpload={(file) => {
          console.log('Selected PDF:', file)
        }}
      />
    </>
  )
}
