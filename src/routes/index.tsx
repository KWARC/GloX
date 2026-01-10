import UploadDialog from "@/components/UploadDialog";
import { currentUser } from "@/serverFns/currentUser.server";
import { Button, Stack, Text, Title } from "@mantine/core";
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
  });

  const isLoggedIn = user?.loggedIn;

  return (
    <>
      <Stack align="center" justify="center" mih="100%">
        <Title order={1}>GloX</Title>
        <Text c="dimmed">
          Knowledge curation from PDFs with OCR and structured definitions.
        </Text>

        <Button
          onClick={() => setOpened(true)}
          disabled={!isLoggedIn}
          title={!isLoggedIn ? "Please login to upload files" : ""}
        >
          Upload PDF
        </Button>
      </Stack>

      <UploadDialog opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}
