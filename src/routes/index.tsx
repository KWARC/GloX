import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Stack, Title, Text, Button } from "@mantine/core";
import UploadDialog from "@/components/UploadDialog";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signUp";
import MyFilesPage from "@/pages/my-files";

type PageKey = "login" | "signup" | "my-files" | "upload" | undefined;

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    const raw = typeof search.page === "string" ? search.page : undefined;
    const allowed: PageKey[] = ["login", "signup", "my-files", "upload", undefined];
    const page = allowed.includes(raw as PageKey) ? (raw as PageKey) : undefined;

    return { page };
  },
  component: IndexPage,
});

function IndexPage() {
  const { page } = Route.useSearch();

  const [opened, setOpened] = useState(page === "upload");

  if (page === "login") return <LoginPage />;
  if (page === "signup") return <SignupPage />;
  if (page === "my-files") return <MyFilesPage />;

  return (
    <>
      <Stack align="center" justify="center" mih="100%">
        <Title order={1}>GloX</Title>
        <Text c="dimmed">
          Knowledge curation from PDFs with OCR and structured definitions.
        </Text>
        <Button onClick={() => setOpened(true)}>Upload PDF</Button>
      </Stack>

      <UploadDialog opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}