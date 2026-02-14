import { CurationSection } from "@/components/CurationSection";
import { FinalizedDocumentsSection } from "@/components/FinalizedDocumentsSection";
import UploadDialog from "@/components/UploadDialog";
import { currentUser } from "@/server/auth/currentUser";
import { Button, Divider, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const [opened, setOpened] = useState(false);

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
    retry: false,
    staleTime: 60_000,
  });

  const isLoggedIn = user?.loggedIn;

  return (
    <>
      <Stack align="center" justify="flex-start" mih="100vh" p="xl" gap="xl">
        <Stack align="center" gap="md">
          <Title order={1}>GloX</Title>
          <Text c="dimmed">
            Knowledge curation from PDFs with OCR and structured definitions.
          </Text>

          <Button onClick={() => setOpened(true)} disabled={!isLoggedIn}>
            Upload PDF
          </Button>
        </Stack>

        {isLoggedIn && (
          <>
            <CurationSection />
            <Divider w="100%" maw={1000} />
            <FinalizedDocumentsSection />
          </>
        )}
      </Stack>

      <UploadDialog opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}
