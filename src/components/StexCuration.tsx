import { queryClient } from "@/queryClient";
import { injectProvenance } from "@/server/ftml/addProvenanceData";
import { generateStexFromFtml } from "@/server/ftml/generateStexFromFtml";
import { ExtractedItem } from "@/server/text-selection";
import { getCombinedDefinitionFtml } from "@/serverFns/definitionAggregate.server";
import { getDefinitionProvenance } from "@/serverFns/definitionProvenance.server";
import {
  getDefinitionFileStatus,
  updateDefinitionsStatusByIdentity,
} from "@/serverFns/definitionStatus.server";
import { deleteDefinition, updateDefinition } from "@/serverFns/extractDefinition.server";
import { FileIdentity, getDefinitionsByIdentity } from "@/serverFns/latex.server";
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
  Select,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, Download, FolderSymlink } from "lucide-react";
import { useState } from "react";
import { DefinitionIdentityDialog } from "./DefinitionFilePathDialog";
import { DuplicateDefinitionDialog } from "./DuplicateDefinitionDialog";
import { ExtractedTextPanel } from "./ExtractedTextList";
import { useNavigate } from "@tanstack/react-router";

const STATUS_CONFIG = {
  SUBMITTED_TO_MATHHUB: {
    color: "teal",
    label: "Submitted to MathHub",
    actionLabel: "Unsubmit from MathHub",
    actionColor: "red" as const,
    nextStatus: "FINALIZED_IN_FILE" as const,
    disabledWhen: (s: string) => s !== "SUBMITTED_TO_MATHHUB",
  },
  FINALIZED_IN_FILE: {
    color: "blue",
    label: "Submit to MathHub",
    actionLabel: "Submit to MathHub",
    actionColor: "blue" as const,
    nextStatus: "SUBMITTED_TO_MATHHUB" as const,
    disabledWhen: (s: string) => s !== "FINALIZED_IN_FILE",
  },
  EXTRACTED: {
    color: "gray",
    label: "Extracted",
    actionLabel: "Submit to MathHub",
    actionColor: "blue" as const,
    nextStatus: "SUBMITTED_TO_MATHHUB" as const,
    disabledWhen: (s: string) => s !== "FINALIZED_IN_FILE",
  },
  DISCARDED: {
    color: "red",
    label: "Discarded",
    actionLabel: "Discarded",
    actionColor: "red",
  },
} as const;

export function StexCuration({ identity }: { identity: FileIdentity }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [definitionMetaEditOpen, setDefinitionMetaEditOpen] = useState(false);

  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState("");
  const [definitionMetaTarget, setDefinitionMetaTarget] = useState<ExtractedItem | null>(null);
  const [latexOpen, setLatexOpen] = useState(false);
  const [latexCode, setLatexCode] = useState("");
  const [dupOpen, setDupOpen] = useState(false);
  const [duplicateUris, setDuplicateUris] = useState<string[]>([]);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["definitionsByIdentity", identity],
    queryFn: () =>
      getDefinitionsByIdentity({
        data: identity,
      }),
  });

  const { data: provenance } = useQuery({
    queryKey: ["definition-provenance", identity.documentId],
    queryFn: () =>
      getDefinitionProvenance({
        data: identity,
      }),
  });

  const { data: definitionStatus } = useQuery({
    queryKey: [
      "definition-status",
      identity.documentId,
      identity.futureRepo,
      identity.filePath,
      identity.fileName,
      identity.language,
    ],
    queryFn: () =>
      getDefinitionFileStatus({
        data: identity,
      }),
  });

  const hasSymbols = (data?.symbols.length ?? 0) > 0;
  const currentStatus = (definitionStatus as keyof typeof STATUS_CONFIG) ?? "EXTRACTED";
  const statusConf = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG.EXTRACTED;

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

      let stex = await generateStexFromFtml(ftmlAst, identity.fileName);
      stex = injectProvenance(stex ?? "", provenance);

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

  async function handleOpenLatexPreview(item?: ExtractedItem) {
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

      let stex = await generateStexFromFtml(ftmlAst, identity.fileName);
      stex = injectProvenance(stex ?? "", provenance);

      setLatexCode(stex);
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
              borderBottom: "1px solid var(--mantine-color-gray-2)",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            <Group justify="space-between" align="center" mb={6}>
              <Text size="xs" fw={700} c="gray.6" tt="uppercase" lts={0.5}>
                Symbol Declared
              </Text>

              <Group gap={6}>
                {duplicateUris.length > 0 && (
                  <Tooltip
                    label={`${duplicateUris.length} duplicate definition found on MathHub`}
                    withArrow
                    color="red"
                  >
                    <ActionIcon size="sm" variant="light" color="red">
                      <AlertTriangle size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}

                <Tooltip label="Download .tex file" withArrow position="top">
                  <ActionIcon size="sm" variant="subtle" color="gray" onClick={handleDownload}>
                    <Download size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            {hasSymbols ? (
              <Group gap={6} wrap="wrap">
                {data?.symbols.map((symbol, index) => (
                  <Badge
                    key={`${symbol.id}-${index}`}
                    size="sm"
                    variant="light"
                    color="blue"
                    radius="sm"
                    styles={{
                      root: { textTransform: "none", fontWeight: 500 },
                    }}
                  >
                    {symbol.label}
                  </Badge>
                ))}
              </Group>
            ) : (
              <Text size="xs" c="dimmed" fs="italic">
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
            <Box
              px="md"
              pt="sm"
              pb="xs"
              style={{ borderBottom: "1px solid var(--mantine-color-gray-1)" }}
            >
              <Group justify="space-between" align="center" wrap="nowrap">
                <Text size="xs" fw={700} c="gray.6" tt="uppercase" lts={0.5}>
                  Definitions
                </Text>

                <Group gap={6} wrap="nowrap">
                  <Menu shadow="md" width={230} position="bottom-end">
                    <Menu.Target>
                      <Tooltip
                        withArrow
                        multiline
                        w={260}
                        label={
                          definitionStatus === "DISCARDED" ? (
                            <Stack gap={2}>
                              <Text fw={600} size="xs">
                                Discarded
                              </Text>
                              <Text size="xs">Reason: {discardReason || "Not specified"}</Text>
                            </Stack>
                          ) : (
                            "Finalize LaTeX first before submitting to MathHub"
                          )
                        }
                      >
                        <Button
                          size="xs"
                          variant="light"
                          color={statusConf.color}
                          rightSection={<ChevronDown size={12} />}
                          styles={{ section: { marginLeft: 4 } }}
                        >
                          {statusConf.label}
                        </Button>
                      </Tooltip>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Label>Status Actions</Menu.Label>

                      <Menu.Item
                        disabled={definitionStatus !== "FINALIZED_IN_FILE"}
                        onClick={async () => {
                          await updateDefinitionsStatusByIdentity({
                            data: {
                              identity,
                              status: "SUBMITTED_TO_MATHHUB",
                            },
                          });

                          await queryClient.invalidateQueries({
                            queryKey: [
                              "definition-status",
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
                        disabled={definitionStatus !== "SUBMITTED_TO_MATHHUB"}
                        onClick={async () => {
                          await updateDefinitionsStatusByIdentity({
                            data: {
                              identity,
                              status: "FINALIZED_IN_FILE",
                            },
                          });

                          await queryClient.invalidateQueries({
                            queryKey: [
                              "definition-status",
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

                      {/* ADD THIS */}
                      <Menu.Divider />

                      <Menu.Item color="red" onClick={() => setDiscardOpen(true)}>
                        Discard
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>

                  <Button size="xs" variant="light" onClick={() => setDupOpen(true)}>
                    Check duplicate
                  </Button>
                </Group>
              </Group>
            </Box>

            <ScrollArea type="auto" scrollbarSize={6} style={{ flex: 1 }} px="md" py="sm">
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
                    onOpenSemanticPanel={() => {}}
                    showPageNumber={false}
                    showDefinitionMeta
                    showDefinitionMetaIconOnly
                    onEditDefinitionMeta={handleEditDefinitionMeta}
                    isLocked={definitionStatus === "SUBMITTED_TO_MATHHUB"}
                    onOpenLatexPreview={(item) => handleOpenLatexPreview(item)}
                  />
                </Stack>
              )}
            </ScrollArea>
          </Box>

          <Box
            px="md"
            py="xs"
            style={{
              borderTop: "1px solid var(--mantine-color-gray-2)",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            <Group justify="space-between" align="center">
              <Group
                gap={6}
                wrap="nowrap"
                style={{
                  cursor: "pointer",
                  minWidth: 0,
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                <FolderSymlink size={13} />
                <Text size="10px" c="dimmed" ff="monospace">
                  {[identity.futureRepo, identity.filePath, identity.fileName, identity.language]
                    .filter(Boolean)
                    .join(" / ")}
                </Text>
              </Group>

              <Group gap="xs">
                <Tooltip label="Preview sTeX" withArrow>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="blue"
                    onClick={() => handleOpenLatexPreview()}
                  >
                    LaTeX
                  </Button>
                </Tooltip>

                <Button
                  size="xs"
                  variant="light"
                  onClick={() =>
                    navigate({
                      to: "/my-files/$documentId",
                      params: { documentId: identity.documentId },
                    })
                  }
                >
                  Go to My Files
                </Button>
              </Group>
            </Group>
          </Box>
        </Stack>
      </Paper>

      <Modal
        opened={latexOpen}
        onClose={() => setLatexOpen(false)}
        title={
          <Group justify="space-between" w="100%">
            <Group gap="xs">
              <Text fw={600}>LaTeX Preview</Text>
              <Badge size="sm" variant="light" color="violet">
                {identity.fileName}.{identity.language}.tex
              </Badge>
            </Group>

            <Tooltip label="Download .tex">
              <ActionIcon variant="light" onClick={handleDownload}>
                <Download size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        }
        size="xl"
        padding="lg"
      >
        <Textarea
          value={latexCode}
          onChange={(e) => setLatexCode(e.currentTarget.value)}
          autosize
          minRows={25}
          readOnly={definitionStatus === "SUBMITTED_TO_MATHHUB"}
          styles={{
            input: {
              fontFamily: "monospace",
              fontSize: 13,
              lineHeight: 1.6,
              backgroundColor: "var(--mantine-color-gray-0)",
            },
          }}
        />
        <Group justify="flex-end" mt="md" gap="sm">
          {/* FINAL BUTTON */}
          <Button
            color="blue"
            disabled={definitionStatus === "SUBMITTED_TO_MATHHUB"}
            onClick={async () => {
              await updateDefinitionsStatusByIdentity({
                data: {
                  identity,
                  status: "FINALIZED_IN_FILE",
                },
              });

              await queryClient.invalidateQueries({
                queryKey: [
                  "definition-status",
                  identity.documentId,
                  identity.futureRepo,
                  identity.filePath,
                  identity.fileName,
                  identity.language,
                ],
              });
            }}
          >
            Final
          </Button>

          {/* SUBMIT BUTTON */}
          <Button
            color="teal"
            disabled={definitionStatus !== "FINALIZED_IN_FILE"}
            onClick={async () => {
              await updateDefinitionsStatusByIdentity({
                data: {
                  identity,
                  status: "SUBMITTED_TO_MATHHUB",
                },
              });

              await queryClient.invalidateQueries({
                queryKey: [
                  "definition-status",
                  identity.documentId,
                  identity.futureRepo,
                  identity.filePath,
                  identity.fileName,
                  identity.language,
                ],
              });

              setLatexOpen(false);
            }}
          >
            Submit to MathHub
          </Button>
        </Group>
      </Modal>

      <Modal opened={discardOpen} onClose={() => setDiscardOpen(false)} title="Discard Definition">
        <Stack>
          <Select
            label="Reason"
            placeholder="Select reason"
            data={["POOR QUALITY", "NOT A DEFINITION"]}
            value={discardReason}
            onChange={(value) => setDiscardReason(value || "")}
          />

          <Textarea
            label="Custom reason"
            placeholder="Enter reason"
            value={discardReason}
            onChange={(e) => setDiscardReason(e.currentTarget.value)}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDiscardOpen(false)}>
              Cancel
            </Button>

            <Button
              color="red"
              onClick={async () => {
                await updateDefinitionsStatusByIdentity({
                  data: {
                    identity,
                    status: "DISCARDED",
                    discardedReason: discardReason,
                  },
                });

                setDiscardOpen(false);
              }}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
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
      {data?.definitions && (
        <DuplicateDefinitionDialog
          opened={dupOpen}
          onClose={() => setDupOpen(false)}
          extracts={data.definitions}
          identity={identity}
          onConfirm={(dups) => {
            setDuplicateUris(dups);
          }}
        />
      )}
    </>
  );
}
