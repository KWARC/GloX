import { UriAutoComplete } from "@/components/UriAutoComplete"; // Add this import
import { documentByIdQuery } from "@/queries/documentById";
import { documentPagesQuery } from "@/queries/documentPages";
import { queryClient } from "@/queryClient";
import { currentUser } from "@/serverFns/currentUser.server";
import { createDefiniendum } from "@/serverFns/definiendum.server";
import {
  createExtractedText,
  listExtractedText,
  updateExtractedText,
} from "@/serverFns/extractText.server";
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Flex,
  Group,
  Loader,
  Paper,
  Portal,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

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

  const [editingId, setEditingId] = useState<string | null>(null);

  const [selection, setSelection] = useState("");
  const [popup, setPopup] = useState<{
    x: number;
    y: number;
    source: "left" | "right";
  } | null>(null);

  const [activePage, setActivePage] = useState<{
    id: string;
    pageNumber: number;
  } | null>(null);

  const [mode, setMode] = useState<"definition" | null>(null);
  const [conceptUri, setConceptUri] = useState<string>("");
  const [selectedUri, setSelectedUri] = useState<string>(""); // For UriAutoComplete

  function handleSelection(
    source: "left" | "right",
    page?: { id: string; pageNumber: number }
  ) {
    if (source === "left" && page) {
      setActivePage({
        id: page.id,
        pageNumber: page.pageNumber,
      });
    }

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

  async function extractToRight() {
    if (!activePage) return;

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

    await createExtractedText({
      data: {
        documentId,
        documentPageId: activePage.id,
        pageNumber: activePage.pageNumber,
        originalText: selection,
        statement: selection,
        futureRepo: futureRepo.trim(),
        filePath: filePath.trim(),
      },
    } as any);

    await queryClient.invalidateQueries({
      queryKey: ["extracts", documentId],
    });

    clearPopup();

    clearPopup();
  }

  function handleUriSelect() {
    console.log("Selected URI:", selectedUri);
    setMode(null);
    setSelectedUri(""); // Reset after selection
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
        symbolName: selection,
        symbolDeclared: true,
        futureRepo: futureRepo.trim(),
        filePath: filePath.trim(),
      },
    } as any);

    await queryClient.invalidateQueries({
      queryKey: ["definienda", documentId],
    });

    clearPopup();
  }

  const { data: extracts = [] } = useQuery({
    queryKey: ["extracts", documentId],
    queryFn: () => listExtractedText({ data: { documentId } as any }),
  });

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
                      onMouseUp={() => handleSelection("left", page)}
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
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap="sm">
                {!extracts.length ? (
                  <Text size="sm" c="dimmed" ta="center">
                    No extracted text yet
                  </Text>
                ) : (
                  extracts.map((item) => (
                    <Paper key={item.id} withBorder p="sm" radius="md">
                      <Group justify="space-between" mb={4}>
                        <Text size="xs" c="dimmed">
                          Page {item.pageNumber}
                        </Text>

                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          onClick={() =>
                            setEditingId(editingId === item.id ? null : item.id)
                          }
                        >
                          ✎
                        </ActionIcon>
                      </Group>

                      {editingId === item.id ? (
                        <Textarea
                          defaultValue={item.statement}
                          autosize
                          onBlur={async (e) => {
                            await updateExtractedText({
                              data: {
                                id: item.id,
                                statement: e.currentTarget.value,
                              },
                            } as any);

                            setEditingId(null);

                            await queryClient.invalidateQueries({
                              queryKey: ["extracts", documentId],
                            });
                          }}
                        />
                      ) : (
                        <Text
                          size="sm"
                          lh={1.6}
                          style={{ userSelect: "text", cursor: "text" }}
                          onMouseUp={() => handleSelection("right")}
                        >
                          {item.statement}
                        </Text>
                      )}
                    </Paper>
                  ))
                )}
              </Stack>
            </ScrollArea>
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
                  Definiendum
                </Text>
                <Divider orientation="vertical" />
                <Text
                  size="sm"
                  fw={600}
                  c="teal.7"
                  style={{ cursor: "pointer", padding: "2px 8px" }}
                  onClick={() => {
                    setMode("definition");
                    setConceptUri(selection);
                    clearPopup();
                  }}
                >
                  Symbolic Ref
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
              maxHeight: "calc(100vh - 120px)",
              overflowY: "auto",
              zIndex: 4000,
              border: "2px solid var(--mantine-color-blue-4)",
            }}
          >
            <Stack gap="sm">
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <Text fw={600}>🔖 URI Autocomplete</Text>
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={() => setMode(null)}
                >
                  ×
                </ActionIcon>
              </Group>

              <Paper withBorder p="sm" bg="blue.0" radius="md">
                <Text size="xs" fw={600} c="dimmed" mb={4}>
                  Selected Text:
                </Text>
                <Text size="sm" fw={500}>
                  {conceptUri}
                </Text>
              </Paper>

              <Text size="sm" c="dimmed" lh={1.6}>
                Search for matching URIs below:
              </Text>
              
              <UriAutoComplete
                selectedText={conceptUri}
                value={selectedUri}
                onChange={setSelectedUri}
                label="Matching URIs"
                placeholder="Click here to see matching URIs..."
              />

              {selectedUri && (
                <Paper withBorder p="sm" bg="green.0" radius="md">
                  <Text size="xs" fw={600} c="dimmed" mb={4}>
                    Selected URI:
                  </Text>
                  <Text size="xs" style={{ wordBreak: "break-all" }}>
                    {selectedUri}
                  </Text>
                </Paper>
              )}

              <Button 
                onClick={handleUriSelect}
                disabled={!selectedUri}
                fullWidth
              >
                Select URI
              </Button>
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