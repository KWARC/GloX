import {
  ActionIcon,
  Box,
  Divider,
  Flex,
  Group,
  Loader,
  Paper,
  Portal,
  ScrollArea,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { documentByIdQuery } from "@/queries/documentById";
import { documentPagesQuery } from "@/queries/documentPages";
import { currentUser } from "@/serverFns/currentUser.server";
import { createDefiniendum } from "@/serverFns/definiendum.server";

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

  const [futureRepo, setFutureRepo] = useState("Glox");
  const [fileName, setFileName] = useState("");

  const [extractedText, setExtractedText] = useState("");
  const [editRaw, setEditRaw] = useState(false);

  const [selection, setSelection] = useState("");
  const [popup, setPopup] = useState<{
    x: number;
    y: number;
    source: "left" | "right";
  } | null>(null);

  const [mode, setMode] = useState<"definition" | null>(null);

  function handleSelection(source: "left" | "right") {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const text = sel.toString().trim();
    if (!text) return;

    const rect = sel.getRangeAt(0).getBoundingClientRect();

    setSelection(text);
    setPopup({
      x: rect.right + window.scrollX + 8,
      y: rect.top + window.scrollY - 4,
      source,
    });
  }

  function clearPopup() {
    setSelection("");
    setPopup(null);
  }

  function extractToRight() {
    setExtractedText((prev) => (prev ? prev + "\n\n" + selection : selection));
    clearPopup();
  }

  async function saveDefiniendum() {
    await createDefiniendum({
      name: selection,
      futureRepo,
      filePath: fileName,
    });

    clearPopup();
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
    <Box
      h="100dvh"
      p="md"
      style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      {/* TOP BAR */}
      <Paper withBorder p="sm" mb="md">
        <Group>
          <Text fw={500}>Future Repo</Text>
          <TextInput
            value={futureRepo}
            onChange={(e) => setFutureRepo(e.currentTarget.value)}
            w={260}
          />

          <Text fw={500}>File Name</Text>
          <TextInput
            value={fileName}
            onChange={(e) => setFileName(e.currentTarget.value)}
            placeholder="derivative"
            w={260}
          />
        </Group>
      </Paper>

      {/* PANELS */}
      <Flex gap="md" style={{ flex: 1, minHeight: 0 }}>
        {/* LEFT PANEL */}
        <Box flex={1} style={{ height: "100%" }}>
          <ScrollArea h="100%" onMouseUp={() => handleSelection("left")}>
            <Stack p="md" gap="md">
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
        </Box>

        {/* RIGHT PANEL */}
        <Box w={380}>
          <Paper withBorder p="md" h="100%">
            {!extractedText ? (
              <Text c="dimmed">No extracted text yet</Text>
            ) : (
              <Stack h="100%">
                <Group justify="space-between">
                  <Text fw={500}>Extracted</Text>
                  <Switch
                    label="Edit raw"
                    checked={editRaw}
                    onChange={(e) => setEditRaw(e.currentTarget.checked)}
                  />
                </Group>

                <Box
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                  }}
                >
                  {editRaw ? (
                    <Textarea
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.currentTarget.value)}
                      resize="none"
                      styles={{
                        root: {
                          flex: 1,
                          minHeight: 0,
                          display: "flex",
                          flexDirection: "column",
                        },
                        wrapper: {
                          flex: 1,
                          minHeight: 0,
                          display: "flex",
                        },
                      }}
                    />
                  ) : (
                    <Box
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                      }}
                      onMouseUp={() => handleSelection("right")}
                    >
                      <Text size="sm">{extractedText}</Text>
                    </Box>
                  )}
                </Box>

                <Divider />
                <Text size="xs" c="dimmed">
                  Select text to create Definiendum or Definition
                </Text>
              </Stack>
            )}
          </Paper>
        </Box>
      </Flex>

      {popup && (
        <Portal>
          <Paper
            withBorder
            shadow="sm"
            p="xs"
            style={{
              position: "absolute",
              top: popup.y,
              left: popup.x,
              zIndex: 3000,
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            {popup.source === "left" && (
              <Text
                size="sm"
                fw={500}
                style={{ cursor: "pointer" }}
                onClick={extractToRight}
              >
                Extract
              </Text>
            )}

            {popup.source === "right" && (
              <>
                <Text
                  size="sm"
                  fw={500}
                  style={{ cursor: "pointer" }}
                  onClick={saveDefiniendum}
                >
                  Definiendum
                </Text>
                <Text
                  size="sm"
                  fw={500}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setMode("definition");
                    clearPopup();
                  }}
                >
                  Definition
                </Text>
              </>
            )}

            <ActionIcon size="sm" variant="subtle" onClick={clearPopup}>
              ×
            </ActionIcon>
          </Paper>
        </Portal>
      )}

      {/* DEFINITION FLOW PLACEHOLDER */}
      {mode === "definition" && (
        <Portal>
          <Paper
            withBorder
            shadow="lg"
            p="md"
            style={{
              position: "fixed",
              right: 60,
              top: 80,
              width: 420,
              zIndex: 4000,
            }}
          >
            <Stack>
              <Group justify="space-between">
                <Text fw={500}>MathHub Definition</Text>
                <ActionIcon onClick={() => setMode(null)}>×</ActionIcon>
              </Group>

              <Text size="sm">
                MathHub query will be executed for selected concept.
              </Text>
            </Stack>
          </Paper>
        </Portal>
      )}
    </Box>
  );
}
