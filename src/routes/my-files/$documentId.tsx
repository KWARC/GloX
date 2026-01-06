import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Stack,
  Title,
  Text,
  Loader,
  Paper,
  ScrollArea,
  Divider,
} from '@mantine/core'

import { currentUser } from '@/serverFns/currentUser.server'
import { documentByIdQuery } from '@/queries/documentById'
import { documentPagesQuery } from '@/queries/documentPages'

export const Route = createFileRoute('/my-files/$documentId')({
  beforeLoad: async () => {
    const user = await currentUser()
    if (!user?.loggedIn) throw redirect({ to: '/login' })
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { documentId } = Route.useParams()

  const { data: document, isLoading: docLoading } = useQuery(
    documentByIdQuery(documentId)
  )

  const { data: pages = [], isLoading: pagesLoading } = useQuery(
    documentPagesQuery(documentId)
  )

  if (docLoading || pagesLoading) {
    return (
      <Stack align="center" p="xl">
        <Loader />
      </Stack>
    )
  }

  if (!document) {
    return <Text c="red">Document not found</Text>
  }

  return (
    <Stack p="md">
      <Title order={2}>{document.filename}</Title>
      <Text size="sm" c="dimmed">
        Status: {document.status}
      </Text>

      <Divider my="md" />

      {pages.length === 0 ? (
        <Text c="dimmed">No extracted pages</Text>
      ) : (
        <ScrollArea h={500}>
          <Stack gap="md">
            {pages.map((page) => (
              <Paper key={page.id} withBorder p="md">
                <Text fw={500} mb="xs">
                  Page {page.pageNumber}
                </Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {page.text}
                </Text>
              </Paper>
            ))}
          </Stack>
        </ScrollArea>
      )}
    </Stack>
  )
}
