import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Stack,
  Title,
  Text,
  Loader,
  Paper,
  ScrollArea,
} from '@mantine/core'
import { documentByIdQuery } from '@/queries/documentById'
import { currentUser } from '@/serverFns/currentUser.server'

export const Route = createFileRoute('/my-files/$documentId')({
  beforeLoad: async () => {
    const user = await currentUser()
    if (!user?.loggedIn) {
      throw redirect({ to: '/login' })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { documentId } = Route.useParams()

  const { data, isLoading } = useQuery(
    documentByIdQuery(documentId)
  )

  if (isLoading) {
    return (
      <Stack align="center" p="xl">
        <Loader />
      </Stack>
    )
  }

  if (!data) {
    return <Text c="red">Document not found</Text>
  }

  return (
    <Stack p="md">
      <Title order={2}>{data.filename}</Title>

      <Text size="sm" c="dimmed">
        Status: {data.status}
      </Text>

      <Paper withBorder p="md">
        {data.extractedText ? (
          <ScrollArea h={500}>
            <Text
              style={{ whiteSpace: 'pre-wrap' }}
              size="sm"
            >
              {data.extractedText}
            </Text>
          </ScrollArea>
        ) : (
          <Text c="dimmed">
            No extracted text available
          </Text>
        )}
      </Paper>
    </Stack>
  )
}
