import { queryClient } from "@/queryClient";
import { generateStexFromFtml } from "@/server/ftml/generateStexFromFtml";
import { ExtractedItem } from "@/server/text-selection";
import { getCombinedDefinitionFtml } from "@/serverFns/definitionAggregate.server";
import {
  deleteDefinition,
  updateDefinition,
} from "@/serverFns/extractDefinition.server";
import {
  FileIdentity,
  getDefinitionsByIdentity,
  getLatexHistory,
} from "@/serverFns/latex.server";
import { FtmlStatement } from "@/types/ftml.types";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Menu,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, FolderSymlink } from "lucide-react";
import { useState } from "react";
import { DefinitionIdentityDialog } from "./DefinitionFilePathDialog";
import { ExtractedTextPanel } from "./ExtractedTextList";

export function StexCuration({ identity }: { identity: FileIdentity }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [definitionMetaEditOpen, setDefinitionMetaEditOpen] = useState(false);
  const [definitionMetaTarget, setDefinitionMetaTarget] =
    useState<ExtractedItem | null>(null);

  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const [semanticPanelDefId, setSemanticPanelDefId] = useState<string | null>(
    null,
  );
  const [latexOpen, setLatexOpen] = useState(false);
  const [latexCode, setLatexCode] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["definitionsByIdentity", identity],
    queryFn: () =>
      getDefinitionsByIdentity({
        data: identity,
      }),
  });

  const { data: latexHistory } = useQuery({
    queryKey: [
      "latex-status",
      identity.documentId,
      identity.futureRepo,
      identity.filePath,
      identity.fileName,
      identity.language,
    ],
    queryFn: () =>
      getLatexHistory({
        data: identity,
      }),
  });

  const latexStatus = latexHistory?.status ?? "EXTRACTED";

  const hasSymbols = (data?.symbols.length ?? 0) > 0;
  function handleEditDefinitionMeta(item: ExtractedItem) {
    setDefinitionMetaTarget(item);
    setDefinitionMetaEditOpen(true);
  }

  async function handleDownload() {
    try {
      const ftmlAst = await getCombinedDefinitionFtml({
        data: {
          documentId: identity.documentId,
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,
        },
      });

      if (!ftmlAst) {
        alert("No FTML found.");
        return;
      }

      const stex = await generateStexFromFtml(ftmlAst, identity.fileName);

      if (!stex) {
        alert("LaTeX generation failed.");
        return;
      }

      const blob = new Blob([stex], {
        type: "application/x-tex",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${identity.fileName}.${identity.language}.tex`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error(error);
      alert("Something went wrong while downloading.");
    }
  }

  async function handleDelete(id: string) {
    await deleteDefinition({ data: { id } });
    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
  }

  async function handleUpdate(id: string, statement: FtmlStatement) {
    await updateDefinition({ data: { id, statement } });
    setEditingId(null);
    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
  }

  function handleToggleEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
  }

  function handleOpenSemanticPanel(id: string) {
    setSemanticPanelDefId(id);
    setSemanticPanelOpen(true);
  }

  async function handleOpenLatexPreview() {
    try {
      const ftmlAst = await getCombinedDefinitionFtml({
        data: {
          documentId: identity.documentId,
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,
        },
      });

      if (!ftmlAst) {
        alert("No FTML found");
        return;
      }

      const stex = await generateStexFromFtml(ftmlAst, identity.fileName);

      setLatexCode(stex || "");
      setLatexOpen(true);
    } catch (e) {
      console.error(e);
      alert("Failed to load LaTeX preview");
    }
  }
  return (
    <>
      <Paper
        withBorder
        p={0}
        radius="md"
        style={{
          aspectRatio: "1 / 1",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "box-shadow 150ms ease, border-color 150ms ease",
          borderColor: "var(--mantine-color-gray-3)",
        }}
        styles={{
          root: {
            "&:hover": {
              boxShadow: "var(--mantine-shadow-sm)",
              borderColor: "var(--mantine-color-gray-4)",
            },
          },
        }}
      >
        <Stack gap={0} style={{ height: "100%" }}>
          <Box
            px="md"
            py="sm"
            style={{
              borderBottom: "1px solid var(--mantine-color-gray-1)",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            <Group justify="space-between" align="center">
              <Text size="xs" fw={600} c="gray.7" tt="uppercase">
                Symbol Declared
              </Text>

              <ActionIcon size="sm" variant="subtle" onClick={handleDownload}>
                <Download size={16} />
              </ActionIcon>
            </Group>

            {hasSymbols ? (
              <Group gap={6}>
                {data?.symbols.map((symbol, index) => (
                  <Badge
                    key={`${symbol.id}-${index}`}
                    size="sm"
                    variant="light"
                    color="blue"
                    styles={{
                      root: {
                        textTransform: "none",
                        fontWeight: 500,
                      },
                    }}
                  >
                    {symbol.label}
                  </Badge>
                ))}
              </Group>
            ) : (
              <Text size="xs" c="dimmed">
                No symbol declared
              </Text>
            )}
          </Box>

          <Box
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box px="md" pt="sm" pb="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={600} c="gray.7" tt="uppercase">
                  Definitions
                </Text>

                <Menu shadow="md" width={220}>
                  <Menu.Target>
                    <Button
                      size="xs"
                      variant="light"
                      rightSection={<ChevronDown size={14} />}
                      color={latexStatus === "SUBMITTED" ? "green" : "gray"}
                    >
                      {latexStatus === "SUBMITTED"
                        ? "MathHub Submitted"
                        : "MathHub Status"}
                    </Button>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>MathHub Actions</Menu.Label>

                    <Menu.Item
                      disabled={latexStatus === "SUBMITTED"}
                      onClick={async () => {
                        // todo updatelatuxstatus

                        await queryClient.invalidateQueries({
                          queryKey: [
                            "latex-status",
                            identity.documentId,
                            identity.futureRepo,
                            identity.filePath,
                            identity.fileName,
                            identity.language,
                          ],
                        });
                      }}
                    >
                      Submit to MathHub
                    </Menu.Item>

                    <Menu.Item
                      color="red"
                      disabled={latexStatus !== "SUBMITTED"}
                      onClick={async () => {
                        // todo updatelatexstatus

                        await queryClient.invalidateQueries({
                          queryKey: [
                            "latex-status",
                            identity.documentId,
                            identity.futureRepo,
                            identity.filePath,
                            identity.fileName,
                            identity.language,
                          ],
                        });
                      }}
                    >
                      Unsubmit from MathHub
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Box>

            <ScrollArea
              type="auto"
              scrollbarSize={6}
              style={{ flex: 1 }}
              px="md"
              pb="md"
            >
              {isLoading && (
                <Group justify="center" py="lg">
                  <Loader size="sm" />
                </Group>
              )}

              {!isLoading && (
                <Stack gap="md">
                  <ExtractedTextPanel
                    extracts={data?.definitions ?? []}
                    editingId={editingId}
                    selectedId={null}
                    onToggleEdit={handleToggleEdit}
                    onUpdate={handleUpdate}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    onSelection={() => {}}
                    onOpenSemanticPanel={handleOpenSemanticPanel}
                    showPageNumber={false}
                    showDefinitionMeta
                    showDefinitionMetaIconOnly
                    onEditDefinitionMeta={handleEditDefinitionMeta}
                    isLocked={latexStatus === "SUBMITTED"}
                  />
                </Stack>
              )}
            </ScrollArea>
          </Box>
          <Box
            px="md"
            pt="sm"
            pb="xs"
            style={{
              borderBottom: "1px solid var(--mantine-color-gray-2)",
            }}
          >
            <Group justify="space-between">
              <Group
                gap={6}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setDefinitionMetaTarget(null);
                  setDefinitionMetaEditOpen(true);
                }}
              >
                <FolderSymlink size={14} />
                <Text size="xs" c="dimmed" ff="monospace" lh={1.4}>
                  {[
                    identity.futureRepo,
                    identity.filePath,
                    identity.fileName,
                    identity.language,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                </Text>
              </Group>
              <Group mt="xs" w="100%">
                <Button
                  size="xs"
                  variant="light"
                  ml="auto"
                  onClick={handleOpenLatexPreview}
                >
                  Open LaTeX Editor
                </Button>
              </Group>
            </Group>
          </Box>
        </Stack>
      </Paper>
      <Modal
        opened={latexOpen}
        onClose={() => setLatexOpen(false)}
        title="LaTeX Preview"
        size="xl"
      >
        <Textarea
          value={latexCode}
          readOnly
          autosize
          minRows={25}
          styles={{
            input: {
              fontFamily: "monospace",
              fontSize: 13,
            },
          }}
        />
      </Modal>
      <DefinitionIdentityDialog
        opened={definitionMetaEditOpen}
        onClose={() => {
          setDefinitionMetaEditOpen(false);
          setDefinitionMetaTarget(null);
        }}
        definition={definitionMetaTarget}
        bulkDefinition={identity}
        invalidateKey={["definitionsByIdentity", identity]}
      />
    </>
  );
}
