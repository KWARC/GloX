import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Stack,
  Title,
  Text,
  Loader,
  Paper,
  ScrollArea,
  Divider,
  Group,
  Button,
  Grid,
  Portal,
  ActionIcon,
} from "@mantine/core";

import { currentUser } from "@/serverFns/currentUser.server";
import { documentByIdQuery } from "@/queries/documentById";
import { documentPagesQuery } from "@/queries/documentPages";
import { useState } from "react";

export const Route = createFileRoute("/my-files/$documentId")({
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) throw redirect({ to: "/login" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { documentId } = Route.useParams();

  const { data: document, isLoading: docLoading } = useQuery(
    documentByIdQuery(documentId)
  );

  const { data: pages = [], isLoading: pagesLoading } = useQuery(
    documentPagesQuery(documentId)
  );
  const [extractedText, setExtractedText] = useState("");
  const [pendingSelection, setPendingSelection] = useState("");
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(
    null
  );

  function handleTextSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const text = sel.toString().trim();
    if (!text) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setPendingSelection(text);

    setPopupPos({
      x: rect.right + window.scrollX + 8,
      y: rect.top + window.scrollY - 4,
    });
  }

  function confirmExtract() {
    setExtractedText((prev) =>
      prev ? prev + "\n\n" + pendingSelection : pendingSelection
    );
    setPendingSelection("");
    setPopupPos(null);
  }

  function dismissSelection() {
    setPendingSelection("");
    setPopupPos(null);
  }

  if (docLoading || pagesLoading) {
    return (
      <Stack align="center" p="xl">
        <Loader />
      </Stack>
    );
  }

  if (!document) {
    return <Text c="red">Document not found</Text>;
  }

  return (
    <Grid>
      <Grid.Col span={extractedText ? 9 : 12}>
        {pages.length === 0 ? (
          <Text c="dimmed">No extracted pages</Text>
        ) : (
          <ScrollArea
            h="calc(100vh - 140px)"
            onMouseUp={handleTextSelection}
            style={{ cursor: "text" }}
          >
            <Stack gap="md">
              {pages.map((page) => (
                <Paper key={page.id} withBorder p="md">
                  <Text fw={500} mb="xs">
                    Page {page.pageNumber}
                  </Text>

                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {page.text}
                  </Text>
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
        )}

        {pendingSelection && popupPos && (
          <Portal>
            <Paper
              withBorder
              shadow="sm"
              p="xs"
              style={{
                position: "absolute",
                top: popupPos.y,
                left: popupPos.x,
                zIndex: 2000,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Text
                size="sm"
                fw={500}
                style={{ cursor: "pointer" }}
                onClick={confirmExtract}
              >
                Extract
              </Text>

              <ActionIcon size="sm" variant="subtle" onClick={dismissSelection}>
                ×
              </ActionIcon>
            </Paper>
          </Portal>
        )}
      </Grid.Col>
      {extractedText && (
        <Grid.Col span={3}>
          <Paper withBorder p="md">
            <Text fw={500} mb="xs">
              Extracted text
            </Text>

            <ScrollArea h={450}>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {extractedText}
              </Text>
            </ScrollArea>
          </Paper>
        </Grid.Col>
      )}
    </Grid>
  );
}
