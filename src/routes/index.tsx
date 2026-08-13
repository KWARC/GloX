import { DocumentsTable } from "@/components/DocumentsTable";
import { DocumentUploadPanel } from "@/components/DocumentUploadPanel";
import { currentUser } from "@/server/auth/currentUser";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
    retry: false,
    staleTime: 60_000,
  });

  const isLoggedIn = user?.loggedIn;

  return (
    <Stack maw={1200} mx="auto" p="xl" gap="xl">
      <Stack align="center" gap="md">
        <Title order={1}>GloX</Title>
        <Text c="dimmed" ta="center">
          Glossary Extraction and Curation Process.
        </Text>

        {!isLoggedIn && (
          <Button component={Link} to="/login">
            Sign In
          </Button>
        )}
      </Stack>

      {isLoggedIn ? (
        <>
          <Group justify="center">
            <Button component={Link} to="/module-descriptions" variant="light">
              Module descriptions
            </Button>
          </Group>
          <DocumentUploadPanel />
          <DocumentsTable />
        </>
      ) : (
        <Stack align="center" gap="sm">
          <Text c="dimmed">
            Sign in to upload PDFs and manage your files.
          </Text>
          <Button component={Link} to="/login" variant="light">
            Go to Login
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
