import { queryClient } from "@/queryClient";
import { injectProvenance } from "@/server/ftml/addProvenanceData";
import { generateStexFromFtml } from "@/server/ftml/generateStexFromFtml";
import { ExtractedItem, useTextSelection } from "@/server/text-selection";
import { getCombinedDefinitionFtml } from "@/serverFns/definitionAggregate.server";
import { getDefinitionProvenance } from "@/serverFns/definitionProvenance.server";
import {
  getDefinitionFileStatus,
  updateDefinitionsStatusByIdentity,
} from "@/serverFns/definitionStatus.server";
import {
  deleteDefinition,
  updateDefinition,
} from "@/serverFns/extractDefinition.server";
import {
  FileIdentity,
  getDefinitionsByIdentity,
  saveLatexDraft,
  saveLatexFinal,
} from "@/serverFns/latex.server";
import { createSymbolDefiniendum } from "@/serverFns/symbol.server";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import { updateDefinitionAst } from "@/serverFns/updateDefinition.server";
import {
  FtmlContent,
  FtmlNode,
  FtmlRoot,
  FtmlStatement,
} from "@/types/ftml.types";
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
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, Download, FolderSymlink } from "lucide-react";
import { useState } from "react";
import { DefiniendumDialog } from "./DefiniendumDialog";
import { DefinitionIdentityDialog } from "./DefinitionFilePathDialog";
import { ExtractedTextPanel } from "./ExtractedTextList";
import { SelectionPopup } from "./SelectionPopup";
import { SemanticPanel } from "./SemanticPanel";
import { SymbolicRef } from "./SymbolicRef";

const STATUS_CONFIG = {
  SUBMITTED_TO_MATHHUB: {
    color: "teal",
    label: "Submitted to MathHub",
    actionLabel: "Unsubmit from MathHub",
    actionColor: "red" as const,
    nextStatus: "FINALIZED_IN_FILE" as const,
  },
  FINALIZED_IN_FILE: {
    color: "blue",
    label: "Finalized",
    actionLabel: "Submit to MathHub",
    actionColor: "blue" as const,
    nextStatus: "SUBMITTED_TO_MATHHUB" as const,
  },
  EXTRACTED: {
    color: "gray",
    label: "Extracted",
  },
  DISCARDED: {
    color: "red",
    label: "Discarded",
  },
} as const;

export function StexCuration({ identity }: { identity: FileIdentity }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [definitionMetaEditOpen, setDefinitionMetaEditOpen] = useState(false);

  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardReason, setDiscardReason] = useState("");
  const [definitionMetaTarget, setDefinitionMetaTarget] =
    useState<ExtractedItem | null>(null);
  const [latexOpen, setLatexOpen] = useState(false);
  const [latexCode, setLatexCode] = useState("");
  const navigate = useNavigate();
  const { selection, popup, handleSelection, clearPopupOnly, clearAll } =
    useTextSelection();

  const { data, isLoading } = useQuery({
    queryKey: ["definitionsByIdentity", identity],
    queryFn: () =>
      getDefinitionsByIdentity({
        data: identity,
      }),
  });
  const definitionIds = data?.definitions.map((d) => d.id) ?? [];
  const { data: provenance } = useQuery({
    queryKey: ["definition-provenance", definitionIds],
    queryFn: () =>
      getDefinitionProvenance({
        data: {
          definitionIds,
          documentId: identity.documentId,
          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,
        },
      }),
    enabled: definitionIds.length > 0,
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

  const actualSymbols = Array.from(
    new Set(
      data?.definitions.flatMap((def) =>
        extractSymbolsFromStatement(def.statement),
      ) ?? [],
    ),
  );

  const status = definitionStatus?.status ?? "EXTRACTED";
  const statusConf = STATUS_CONFIG[status] ?? STATUS_CONFIG.EXTRACTED;
  const discardReasonFromServer = definitionStatus?.discardedReason ?? null;
  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const [semanticPanelDefId, setSemanticPanelDefId] = useState<string | null>(
    null,
  );
  const selectedDefinition =
    data?.definitions?.find((d) => d.id === semanticPanelDefId) ?? null;
  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [defExtractId, setDefExtractId] = useState<string | null>(null);
  const [defExtractText, setDefExtractText] = useState<string | null>(null);

  const [mode, setMode] = useState<"SymbolicRef" | null>(null);
  const [conceptUri, setConceptUri] = useState("");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [savedSelection, setSavedSelection] = useState<any>(null);

  function handleEditDefinitionMeta(item: ExtractedItem) {
    setDefinitionMetaTarget(item);
    setDefinitionMetaEditOpen(true);
  }

  function handleOpenSemanticPanel(definitionId: string) {
    setSemanticPanelDefId(definitionId);
    setSemanticPanelOpen(true);
  }

  async function handleReplaceNode(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
    payload: any,
  ) {
    await updateDefinitionAst({
      data: {
        definitionId,
        operation: {
          kind: "replaceSemantic",
          target,
          payload,
        },
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
  }

  async function handleDeleteNode(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ) {
    await updateDefinitionAst({
      data: {
        definitionId,
        operation: {
          kind: "removeSemantic",
          target,
        },
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
  }

  async function handleSaveSymbolicRef(symRef: any) {
    if (!defExtractId) return;

    if (editingNodeId) {
      await updateDefinitionAst({
        data: {
          definitionId: defExtractId,
          operation: {
            kind: "replaceSemantic",
            target: {
              type: "symref",
              uri: editingNodeId,
            },
            payload: {
              type: "symref",
              uri:
                symRef.source === "MATHHUB"
                  ? symRef.uri
                  : `${symRef.futureRepo}/${symRef.symbolName}`,
            },
          },
        },
      });
    } else {
      if (!selection?.text) {
        return;
      }

      await symbolicRef({
        data: {
          definitionId: defExtractId,
          selection: {
            text: savedSelection.text,
            startOffset: selection.startOffset,
            endOffset: selection.endOffset,
          },
          symRef,
        },
      });
    }

    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });

    setMode(null);
    setEditingNodeId(null);
  }

  async function handleDefiniendumSubmit(params: any) {
    if (!defExtractId || !defExtractText) return;

    if (params.mode === "CREATE") {
      await createSymbolDefiniendum({
        data: {
          definitionId: defExtractId,
          selectedText: defExtractText,
          startOffset: selection!.startOffset,
          endOffset: selection!.endOffset,
          symdecl: true,

          futureRepo: identity.futureRepo,
          filePath: identity.filePath,
          fileName: identity.fileName,
          language: identity.language,

          symbolName: params.symbolName,
          alias: params.alias || null,
        },
      });
    } else {
      if (params.selectedSymbol.source === "DB") {
        await createSymbolDefiniendum({
          data: {
            definitionId: defExtractId,
            selectedText: defExtractText,
            startOffset: selection!.startOffset,
            endOffset: selection!.endOffset,
            symdecl: false,

            futureRepo: identity.futureRepo,
            filePath: identity.filePath,
            fileName: identity.fileName,
            language: identity.language,

            symbolName: "",
            selectedSymbolSource: "DB",
            selectedSymbolId: params.selectedSymbol.id,
          },
        });
      } else {
        await createSymbolDefiniendum({
          data: {
            definitionId: defExtractId,
            selectedText: defExtractText,
            startOffset: selection!.startOffset,
            endOffset: selection!.endOffset,
            symdecl: false,

            futureRepo: identity.futureRepo,
            filePath: identity.filePath,
            fileName: identity.fileName,
            language: identity.language,

            symbolName: "",
            selectedSymbolSource: "MATHHUB",
            selectedSymbolUri: params.selectedSymbol.uri,
          },
        });
      }
    }

    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });

    setDefDialogOpen(false);
    setDefExtractId(null);
    setDefExtractText(null);
    clearAll();
  }

  async function handleDownload() {
    try {
      const ftmlAst = await getCombinedDefinitionFtml({
        data: {
          definitionIds,
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

      let stex = await generateStexFromFtml(
        ftmlAst,
        identity.futureRepo,
        identity.filePath,
        identity.fileName,
      );
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

  function extractSymbolsFromStatement(statement: FtmlRoot): string[] {
    const rawContent: FtmlContent[] = Array.isArray(statement)
      ? statement
      : statement.type === "root"
        ? (statement.content ?? [])
        : [statement];

    const nodes: FtmlNode[] = rawContent.filter(
      (c): c is FtmlNode => typeof c === "object" && c !== null,
    );

    const symbols: string[] = [];

    function walk(node: FtmlNode) {
      if (node.type === "definiendum" && (node as any).symdecl === true) {
        const label = (node.content ?? [])
          .filter((c): c is string => typeof c === "string")
          .join("");

        if (label) symbols.push(label);
      }

      if (node.content) {
        for (const child of node.content) {
          if (typeof child === "object" && child !== null) {
            walk(child);
          }
        }
      }
    }

    for (const node of nodes) {
      walk(node);
    }

    return symbols;
  }

  async function handleOpenLatexPreview() {
    try {
      const ftmlAst = await getCombinedDefinitionFtml({
        data: {
          definitionIds,
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

      let stex = await generateStexFromFtml(
        ftmlAst,
        identity.futureRepo,
        identity.filePath,
        identity.fileName,
      );
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
                <Tooltip label="Download .tex file" withArrow position="top">
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="gray"
                    onClick={handleDownload}
                  >
                    <Download size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>

            {actualSymbols.length > 0 ? (
              <Group gap={6} wrap="wrap">
                {actualSymbols.map((symbol) => (
                  <Badge
                    key={symbol}
                    size="sm"
                    variant="light"
                    color="blue"
                    radius="sm"
                  >
                    {symbol}
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
                      {status === "DISCARDED" ? (
                        <Tooltip
                          withArrow
                          multiline
                          w={260}
                          label={
                            <Stack gap={2}>
                              <Text fw={600} size="xs">
                                Discarded
                              </Text>
                              <Text size="xs">
                                Reason:{" "}
                                {discardReasonFromServer || "Not specified"}
                              </Text>
                            </Stack>
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
                      ) : (
                        <Button
                          size="xs"
                          variant="light"
                          color={statusConf.color}
                          rightSection={<ChevronDown size={12} />}
                          styles={{ section: { marginLeft: 4 } }}
                        >
                          {statusConf.label}
                        </Button>
                      )}
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Label>Status Actions</Menu.Label>
                      <Menu.Item
                        onClick={async () => {
                          await updateDefinitionsStatusByIdentity({
                            data: {
                              identity,
                              status: "EXTRACTED",
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
                        Extracted
                      </Menu.Item>
                      <Menu.Item
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
                        Finalized
                      </Menu.Item>
                      <Menu.Item
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
                        Submitted to MathHub
                      </Menu.Item>
                      <Menu.Divider />

                      <Menu.Item
                        color="red"
                        onClick={() => setDiscardOpen(true)}
                      >
                        Discard
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
            </Box>

            <ScrollArea
              type="auto"
              scrollbarSize={6}
              style={{ flex: 1 }}
              px="md"
              py="sm"
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
                    onSelection={(extractId) => {
                      handleSelection("right", { extractId });
                    }}
                    onOpenSemanticPanel={handleOpenSemanticPanel}
                    showPageNumber={false}
                    showDefinitionMeta
                    showDefinitionMetaIconOnly
                    onEditDefinitionMeta={handleEditDefinitionMeta}
                    isLocked={
                      status === "SUBMITTED_TO_MATHHUB" ||
                      status === "DISCARDED"
                    }
                    onOpenLatexPreview={() => handleOpenLatexPreview()}
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
                <Tooltip label="Move file path" withArrow>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={() => {
                      setDefinitionMetaTarget(null);
                      setDefinitionMetaEditOpen(true);
                    }}
                  >
                    <FolderSymlink size={14} />
                  </ActionIcon>
                </Tooltip>

                <Text size="10px" c="dimmed" ff="monospace">
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
                  Go to Source
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
          readOnly={status === "SUBMITTED_TO_MATHHUB" || status === "DISCARDED"}
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
          <Button
            color="blue"
            disabled={
              status === "FINALIZED_IN_FILE" ||
              status === "SUBMITTED_TO_MATHHUB" ||
              status === "DISCARDED"
            }
            onClick={async () => {
              await saveLatexDraft({
                data: {
                  latex: latexCode,
                  definitionIds,
                  documentId: identity.documentId,
                  futureRepo: identity.futureRepo,
                  filePath: identity.filePath,
                  fileName: identity.fileName,
                  language: identity.language,
                },
              });

              await queryClient.invalidateQueries({
                queryKey: ["definitionsByIdentity", identity],
              });

              setLatexOpen(false);
            }}
          >
            Save
          </Button>
          <Button
            color="blue"
            disabled={
              status === "FINALIZED_IN_FILE" ||
              status === "SUBMITTED_TO_MATHHUB" ||
              status === "DISCARDED"
            }
            onClick={async () => {
              await saveLatexFinal({
                data: {
                  latex: latexCode,
                  definitionIds,
                  documentId: identity.documentId,
                  futureRepo: identity.futureRepo,
                  filePath: identity.filePath,
                  fileName: identity.fileName,
                  language: identity.language,
                },
              });

              await queryClient.invalidateQueries({
                queryKey: ["definitionsByIdentity", identity],
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
            Save & Finalize
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title="Discard Definition"
      >
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
        multipleDefinitions={!definitionMetaTarget ? identity : undefined}
        invalidateKey={["definitionsByIdentity", identity]}
      />
      {popup && (
        <SelectionPopup
          popup={popup}
          onClose={clearPopupOnly}
          onDefiniendum={() => {
            if (!selection?.extractId || !selection.text) return;

            setDefExtractId(selection.extractId);
            setDefExtractText(selection.text);
            setDefDialogOpen(true);
          }}
          onSymbolicRef={() => {
            if (!selection?.extractId || !selection.text) return;
            setSavedSelection(selection);

            setDefExtractId(selection.extractId);

            setConceptUri(selection.text);
            setEditingNodeId(null);

            setMode("SymbolicRef");
            clearPopupOnly();
          }}
        />
      )}
      {semanticPanelOpen && (
        <SemanticPanel
          opened={semanticPanelOpen}
          onClose={() => {
            setSemanticPanelOpen(false);
            setSemanticPanelDefId(null);
          }}
          definition={selectedDefinition}
          onReplaceNode={handleReplaceNode}
          onDeleteNode={handleDeleteNode}
        />
      )}

      <DefiniendumDialog
        opened={defDialogOpen}
        extractedText={defExtractText}
        onSubmit={handleDefiniendumSubmit}
        onClose={() => setDefDialogOpen(false)}
      />
      {mode === "SymbolicRef" && (
        <SymbolicRef
          conceptUri={conceptUri}
          onClose={() => setMode(null)}
          onSelect={handleSaveSymbolicRef}
        />
      )}
    </>
  );
}
