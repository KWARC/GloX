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
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { documentByIdQuery } from "@/queries/documentById";
import { documentPagesQuery } from "@/queries/documentPages";
import { currentUser } from "@/serverFns/currentUser.server";
import {
  createDefiniendum,
  listDefinienda,
} from "@/serverFns/definiendum.server";
import { queryClient } from "@/queryClient";

export const Route = createFileRoute("/my-files/$documentId")({
  beforeLoad: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) throw redirect({ to: "/login" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { documentId } = Route.useParams();

  const { data: document, isLoading: docLoading } = useQuery(
    documentByIdQuery(documentId)
  );

  const { data: pages = [], isLoading: pagesLoading } = useQuery(
    documentPagesQuery(documentId)
  );

  const [futureRepo, setFutureRepo] = useState("Glox");
  const [filePath, setFilePath] = useState("");
  const [futureRepoError, setFutureRepoError] = useState<string | null>(null);
  const [filePathError, setFilePathError] = useState<string | null>(null);

  const [extractedText, setExtractedText] = useState("");
  const [editRaw, setEditRaw] = useState(false);

  const [selection, setSelection] = useState("");
  const [popup, setPopup] = useState<{
    x: number;
    y: number;
    source: "left" | "right";
  } | null>(null);

  const [mode, setMode] = useState<"definition" | null>(null);
  const { data: definienda = [], isLoading: defLoading } = useQuery({
    queryKey: ["definienda", documentId],
    queryFn: () => listDefinienda({ data: { documentId } as any }),
  });

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
    let hasError = false;

    if (!futureRepo.trim()) {
      setFutureRepoError("Future Repo is required");
      hasError = true;
    }

    if (!filePath.trim()) {
      setFilePathError("File Path is required");
      hasError = true;
    }

    if (hasError) return;

    await createDefiniendum({
      data: {
        name: selection,
        futureRepo: futureRepo.trim(),
        filePath: filePath.trim(),
      },
    } as any);
    await queryClient.invalidateQueries({
      queryKey: ["definienda", documentId],
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
      <Paper withBorder p="sm" mb="md" bg="gray.0">
        <Group gap="lg">
          <Group gap="xs">
            <Text size="sm" fw={600} c="gray.7">
              Future Repo
            </Text>
            <TextInput
              value={futureRepo}
              onChange={(e) => {
                setFutureRepo(e.currentTarget.value);
                if (futureRepoError) setFutureRepoError(null);
              }}
              w={200}
              size="sm"
              error={futureRepoError}
              styles={{ input: { fontWeight: 500 } }}
            />
          </Group>

          <Group gap="xs">
            <Text size="sm" fw={600} c="gray.7">
              File Path
            </Text>
            <TextInput
              value={filePath}
              onChange={(e) => {
                setFilePath(e.currentTarget.value);
                if (filePathError) setFilePathError(null);
              }}
              placeholder="e.g. derivative"
              w={200}
              size="sm"
              error={filePathError}
              styles={{ input: { fontWeight: 500 } }}
            />
          </Group>
        </Group>
      </Paper>

      <Flex gap="md" style={{ flex: 1, minHeight: 0 }}>
        <Box flex={1} style={{ height: "100%" }}>
          <Paper withBorder h="100%" radius="md">
            <ScrollArea h="100%" onMouseUp={() => handleSelection("left")}>
              <Stack p="lg" gap="lg">
                {pages.map((page) => (
                  <Box key={page.id}>
                    <Text size="xs" fw={700} c="dimmed" mb="xs" tt="uppercase">
                      Page {page.pageNumber}
                    </Text>
                    <Text
                      size="sm"
                      lh={1.8}
                      style={{
                        whiteSpace: "pre-wrap",
                        userSelect: "text",
                        cursor: "text",
                      }}
                    >
                      {page.text}
                    </Text>
                    {page.id !== pages[pages.length - 1]?.id && (
                      <Divider mt="lg" />
                    )}
                  </Box>
                ))}
              </Stack>
            </ScrollArea>
          </Paper>
        </Box>

        <Box w={400}>
          <Paper withBorder p="md" h="100%" radius="md" bg="blue.0">
            {!extractedText ? (
              <Stack align="center" justify="center" h="100%">
                <Text c="dimmed" size="sm" ta="center">
                  Select text from the left panel
                  <br />
                  to extract it here
                </Text>
              </Stack>
            ) : (
              <Stack h="100%" gap="md">
                <Group justify="space-between" mb={4}>
                  <Text fw={600} size="sm" c="blue.9">
                    Extracted Text
                  </Text>
                  <Switch
                    label="Edit raw"
                    labelPosition="left"
                    checked={editRaw}
                    onChange={(e) => setEditRaw(e.currentTarget.checked)}
                    size="sm"
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
                      size="sm"
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
                        input: { lineHeight: 1.8 },
                      }}
                    />
                  ) : (
                    <Box
                      style={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        whiteSpace: "pre-wrap",
                        cursor: "text",
                      }}
                      onMouseUp={() => handleSelection("right")}
                    >
                      <Text size="sm" lh={1.8}>
                        {extractedText}
                      </Text>
                    </Box>
                  )}
                </Box>

                <Divider />
                <Group gap={6} justify="center">
                  <Text size="xs" c="dimmed" ta="center">
                    💡 Select text above to create
                  </Text>
                </Group>
                <Paper
                  withBorder
                  p="sm"
                  radius="md"
                  bg="gray.1"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: 240,
                    minHeight: 160,
                  }}
                >
                  <Text fw={600} size="sm" mb="xs">
                    📌 Saved Definienda
                  </Text>

                  {defLoading ? (
                    <Text size="xs" c="dimmed">
                      Loading…
                    </Text>
                  ) : !definienda.length ? (
                    <Text size="xs" c="dimmed">
                      No definienda saved yet.
                    </Text>
                  ) : (
                    <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                      <Stack gap="xs">
                        {definienda.map((d: any) => (
                          <Box
                            key={d.id}
                            style={{
                              border: "1px solid #ddd",
                              borderRadius: 8,
                              padding: 8,
                            }}
                          >
                            <Text fw={600}>{d.name}</Text>

                            {d.definition && (
                              <Text size="sm" c="gray.7">
                                {d.definition}
                              </Text>
                            )}

                            <Text size="xs" c="dimmed">
                              {d.futureRepo} / {d.filePath}
                            </Text>
                          </Box>
                        ))}
                      </Stack>
                    </ScrollArea>
                  )}
                </Paper>
              </Stack>
            )}
          </Paper>
        </Box>
      </Flex>

      {popup && (
        <Portal>
          <Paper
            withBorder
            shadow="md"
            p={8}
            radius="md"
            style={{
              position: "absolute",
              top: popup.y,
              left: popup.x,
              zIndex: 3000,
              display: "flex",
              gap: 6,
              alignItems: "center",
              border: "2px solid",
              borderColor:
                popup.source === "left"
                  ? "var(--mantine-color-blue-4)"
                  : "var(--mantine-color-teal-4)",
            }}
          >
            {popup.source === "left" && (
              <Text
                size="sm"
                fw={600}
                c="blue.7"
                style={{ cursor: "pointer", padding: "2px 8px" }}
                onClick={extractToRight}
              >
                → Extract
              </Text>
            )}

            {popup.source === "right" && (
              <>
                <Text
                  size="sm"
                  fw={600}
                  c="teal.7"
                  style={{ cursor: "pointer", padding: "2px 8px" }}
                  onClick={saveDefiniendum}
                >
                  📌 Definiendum
                </Text>
                <Divider orientation="vertical" />
                <Text
                  size="sm"
                  fw={600}
                  c="teal.7"
                  style={{ cursor: "pointer", padding: "2px 8px" }}
                  onClick={() => {
                    setMode("definition");
                    clearPopup();
                  }}
                >
                  📖 Definition
                </Text>
              </>
            )}

            <Divider orientation="vertical" />
            <ActionIcon
              size="xs"
              variant="subtle"
              color="gray"
              onClick={clearPopup}
            >
              ×
            </ActionIcon>
          </Paper>
        </Portal>
      )}

      {mode === "definition" && (
        <Portal>
          <Paper
            withBorder
            shadow="xl"
            p="lg"
            radius="md"
            style={{
              position: "fixed",
              right: 60,
              top: 80,
              width: 440,
              zIndex: 4000,
              border: "2px solid var(--mantine-color-blue-4)",
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Text fw={600}>📖 MathHub Definition</Text>
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setMode(null)}
                >
                  ×
                </ActionIcon>
              </Group>

              <Text size="sm" c="dimmed" lh={1.6}>
                MathHub query will be executed for selected concept.
              </Text>
            </Stack>
          </Paper>
        </Portal>
      )}
      <Portal>
        <ActionIcon
          size="xl"
          radius="xl"
          variant="filled"
          style={{
            position: "fixed",
            bottom: 24,
            right: 50,
            zIndex: 5000,
          }}
          onClick={() =>
            navigate({
              to: "/create-latex",
              search: {
                documentId,
              },
            })
          }
        >
          →
        </ActionIcon>
      </Portal>
    </Box>
  );
}
