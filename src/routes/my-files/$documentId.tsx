import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { DefinitionIdentityDialog } from "@/components/DefinitionFilePathDialog";
import { DocumentPagesPanel } from "@/components/DocumentPagesPanel";
import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { ExtractTextDialog } from "@/components/ExtractTextDialog";
import { LatexConfigModel } from "@/components/LatexConfigModel";
import { SelectionPopup } from "@/components/SelectionPopup";
import { SemanticPanel } from "@/components/SemanticPanel";
import { SymbolicRef } from "@/components/SymbolicRef";
import { documentByIdQuery } from "@/queries/documentById";
import { documentPagesQuery } from "@/queries/documentPages";
import { queryClient } from "@/queryClient";
import { currentUser } from "@/server/auth/currentUser";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { normalizeSymRef, parseUri } from "@/server/parseUri";
import {
  ActivePage,
  ExtractedItem,
  useExtractionActions,
  useTextSelection,
  useValidation,
} from "@/server/text-selection";
import { SymbolSearchResult } from "@/server/useSymbolSearch";
import {
  deleteDefinition,
  listDefinition,
} from "@/serverFns/extractDefinition.server";
import { createSymbolDefiniendum } from "@/serverFns/symbol.server";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import { updateDefinitionAst } from "@/serverFns/updateDefinition.server";
import { DefiniendumNode, FtmlStatement } from "@/types/ftml.types";
import {
  Badge,
  Box,
  Button,
  Center,
  Flex,
  Group,
  Loader,
  Paper,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconFileAlert, IconFileText, IconList } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/my-files/$documentId")({
  loader: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) {
      throw redirect({ to: "/login" });
    }
    return null;
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { documentId } = Route.useParams();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  const { data: document, isLoading: docLoading } = useQuery(
    documentByIdQuery(documentId),
  );

  const { data: pages = [], isLoading: pagesLoading } = useQuery(
    documentPagesQuery(documentId),
  );

  const { data: extracts = [] } = useQuery({
    queryKey: ["definitions", documentId],
    queryFn: () => listDefinition({ data: { documentId } }),
  });

  const [futureRepo, setFutureRepo] = useState("smglom/softeng");
  const [filePath, setFilePath] = useState("mod");
  const [fileName, setFileName] = useState("Software");
  const [language, setLanguage] = useState("en");
  const [definitionName, setDefinitionName] = useState("");
  const { validate, clearError } = useValidation();

  const [activePage, setActivePage] = useState<ActivePage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [mode, setMode] = useState<"SymbolicRef" | null>(null);
  const [conceptUri, setConceptUri] = useState<string>("");

  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [defExtractId, setDefExtractId] = useState<string | null>(null);
  const [defExtractText, setDefExtractText] = useState("");
  const [lockedByExtractId, setLockedByExtractId] = useState<string | null>(
    null,
  );

  const [latexConfigOpen, setLatexConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("document");
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const [semanticPanelDefId, setSemanticPanelDefId] = useState<string | null>(
    null,
  );
  const [extractDialogOpen, setExtractDialogOpen] = useState(false);
  const [pendingExtractText, setPendingExtractText] = useState("");
  const [definitionMetaEditOpen, setDefinitionMetaEditOpen] = useState(false);
  const [definitionMetaTarget, setDefinitionMetaTarget] =
    useState<ExtractedItem | null>(null);

  const { selection, popup, handleSelection, clearPopupOnly, clearAll } =
    useTextSelection();
  const { extractText, updateExtract } = useExtractionActions(documentId);

  async function handleDeleteDefinition(id: string) {
    if (!confirm("Delete this extracted definition?")) return;

    await deleteDefinition({ data: { id } });
    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });

    if (lockedByExtractId === id) {
      setLockedByExtractId(null);
      setEditingId(null);
    }
  }

  function handleLeftSelection(pageId: string) {
    setLockedByExtractId(null);

    if (!lockedByExtractId) {
      if (!validate(futureRepo, filePath, fileName, language)) return;
    }

    handleSelection("left");

    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    setActivePage({
      id: page.id,
      pageNumber: page.pageNumber,
    });
  }

  function handleOpenSemanticPanel(definitionId: string) {
    setSemanticPanelDefId(definitionId);
    setSemanticPanelOpen(true);
  }

  function handleEditDefinitionMeta(item: ExtractedItem) {
    setDefinitionMetaTarget(item);
    setFutureRepo(item.futureRepo);
    setFilePath(item.filePath);
    setFileName(item.fileName);
    setLanguage(item.language);
    setDefinitionMetaEditOpen(true);
  }

  async function handleDeleteNode(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ) {
    await updateDefinitionAst({
      data: {
        definitionId,
        operation: { kind: "removeSemantic", target },
      },
    });

    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });
    setSemanticPanelOpen(false);
    setSemanticPanelDefId(null);
  }

  function handleRightSelection(extractId: string) {
    const extract = extracts.find((e) => e.id === extractId);
    if (!extract) return;

    setFutureRepo(extract.futureRepo);
    setFilePath(extract.filePath);
    setFileName(extract.fileName);
    setLanguage(extract.language);

    setLockedByExtractId(extractId);
    clearError("fileName");

    handleSelection("right", { extractId });
  }

  async function handleDefiniendumSubmit(
    params:
      | { mode: "CREATE"; symbolName: string; alias: string; symdecl: true }
      | { mode: "PICK_EXISTING"; selectedSymbol: SymbolSearchResult },
  ) {
    if (!defExtractId) return;
    if (!validate(futureRepo, filePath, fileName, language)) return;

    if (editingNodeId) {
      let newUri: string;

      if (params.mode === "CREATE") {
        newUri = params.symbolName;
      } else if (params.selectedSymbol.source === "DB") {
        newUri = params.selectedSymbol.symbolName;
      } else {
        const parsed = parseUri(params.selectedSymbol.uri);
        newUri = parsed.conceptUri;
      }
      let isDeclared: boolean;

      if (params.mode === "CREATE") {
        isDeclared = true;
      } else {
        isDeclared = false;
      }

      const payload: DefiniendumNode = {
        type: "definiendum",
        uri: newUri,
        content: [
          params.mode === "CREATE"
            ? params.alias || params.symbolName
            : params.selectedSymbol.source === "DB"
              ? params.selectedSymbol.symbolName
              : parseUri(params.selectedSymbol.uri).symbol,
        ],
        symdecl: isDeclared,
      };

      await updateDefinitionAst({
        data: {
          definitionId: defExtractId,
          operation: {
            kind: "replaceSemantic",
            target: { type: "definiendum", uri: editingNodeId },
            payload,
          },
        },
      });
    } else {
      if (params.mode === "CREATE") {
        await createSymbolDefiniendum({
          data: {
            definitionId: defExtractId,
            selectedText: defExtractText,
            startOffset: selection!.startOffset,
            endOffset: selection!.endOffset,
            symdecl: true,
            futureRepo: futureRepo.trim(),
            filePath: filePath.trim(),
            fileName: fileName.trim(),
            language: language.trim(),
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

              futureRepo: futureRepo.trim(),
              filePath: filePath.trim(),
              fileName: fileName.trim(),
              language: language.trim(),

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

              futureRepo: futureRepo.trim(),
              filePath: filePath.trim(),
              fileName: fileName.trim(),
              language: language.trim(),

              symbolName: "",

              selectedSymbolSource: "MATHHUB",
              selectedSymbolUri: params.selectedSymbol.uri,
            },
          });
        }
      }

      await queryClient.invalidateQueries({
        queryKey: ["definitions", documentId],
      });
    }

    setEditingNodeId(null);
    setDefDialogOpen(false);
    setDefExtractId(null);
    setDefExtractText("");
    clearAll();
  }

  async function handleSaveSymbolicRef(symRef: UnifiedSymbolicReference) {
    if (!defExtractId) return;
    if (editingNodeId) {
      const { uri, text } = normalizeSymRef(symRef);

      await updateDefinitionAst({
        data: {
          definitionId: defExtractId,
          operation: {
            kind: "replaceSemantic",
            target: { type: "symref", uri: editingNodeId },
            payload: {
              type: "symref",
              uri,
              content: [text],
            },
          },
        },
      });
    } else {
      if (!selection) return;

      await symbolicRef({
        data: {
          definitionId: defExtractId,
          selection: {
            text: selection.text,
            startOffset: selection.startOffset,
            endOffset: selection.endOffset,
          },
          symRef,
        },
      });
    }

    await queryClient.invalidateQueries({
      queryKey: ["definitions", documentId],
    });
    setEditingNodeId(null);
    setMode(null);
    clearAll();
  }

  function handleOpenSymbolicRef(extractId: string) {
    if (!selection) return;

    setDefExtractId(extractId);
    setConceptUri(selection.text);
    setMode("SymbolicRef");

    clearPopupOnly();
  }

  function handleCloseSymbolicRefDialog() {
    setMode(null);
    setDefExtractId(null);
    clearAll();
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
      queryKey: ["definitions", documentId],
    });
  }

  function handleToggleEdit(id: string) {
    setEditingId(editingId === id ? null : id);
  }

  async function handleUpdateExtract(id: string, statement: FtmlStatement) {
    await updateExtract(id, statement);
    setEditingId(null);
  }

  function handleOpenLatexConfig() {
    setLatexConfigOpen(true);
  }

  async function handleExtractSubmit(editedText: string) {
    if (!activePage) return;
    if (!document) return;
    if (!validate(futureRepo, filePath, fileName, language)) return;

    await extractText({
      documentPageId: activePage.id,
      pageNumber: activePage.pageNumber,
      text: editedText,
      futureRepo: document.futureRepo,
      filePath: document.filePath,
      fileName: definitionName.trim(),
      language: document.language,
    });

    setExtractDialogOpen(false);
    setPendingExtractText("");
    setDefinitionName("");
    clearAll();
  }

  async function handleLatexConfigSubmit(config: {
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  }) {
    const filteredDefinitions = extracts.filter(
      (e) =>
        e.futureRepo === config.futureRepo &&
        e.filePath === config.filePath &&
        e.fileName === config.fileName &&
        e.language === config.language,
    );

    navigate({
      to: "/create-latex",
      search: {
        documentId,
        definitionIds: filteredDefinitions.map((e) => e.id),
        futureRepo: config.futureRepo,
        filePath: config.filePath,
        fileName: config.fileName,
        language: config.language,
      },
    });

    setLatexConfigOpen(false);
  }

  if (docLoading || pagesLoading) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <Loader size="lg" color="blue" />
          <Text size="sm" c="dimmed" fw={500}>
            Loading document…
          </Text>
        </Stack>
      </Center>
    );
  }

  if (!document) {
    return (
      <Center h="100vh">
        <Stack align="center" gap="md">
          <ThemeIcon size={56} radius="xl" color="red" variant="light">
            <IconFileAlert size={28} />
          </ThemeIcon>
          <Text size="lg" fw={600} c="red.7">
            Document not found
          </Text>
          <Text size="sm" c="dimmed">
            The document you're looking for doesn't exist or has been removed.
          </Text>
        </Stack>
      </Center>
    );
  }

  const pad = isMobile ? "xs" : isTablet ? "md" : "lg";
  const gap = isMobile ? "xs" : "md";

  return (
    <Box h="100%" p={pad} style={{ overflow: "hidden" }}>
      <Stack gap={gap} h="100%" style={{ overflow: "hidden" }}>
        {isMobile ? (
          <Paper
            flex={1}
            shadow="xs"
            withBorder
            radius="md"
            style={{
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Tabs.List px="sm" pt="xs">
                <Tabs.Tab
                  value="document"
                  leftSection={<IconFileText size={15} />}
                  fw={500}
                >
                  {document.filename}
                </Tabs.Tab>
                <Tabs.Tab
                  value="extracts"
                  leftSection={<IconList size={15} />}
                  fw={500}
                  rightSection={
                    extracts.length > 0 ? (
                      <Badge size="xs" variant="filled" color="blue" circle>
                        {extracts.length}
                      </Badge>
                    ) : undefined
                  }
                >
                  Extracts
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel
                value="document"
                pt="xs"
                style={{
                  flex: 1,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <DocumentPagesPanel
                  pages={pages}
                  onSelection={handleLeftSelection}
                />
              </Tabs.Panel>

              <Tabs.Panel
                value="extracts"
                pt="xs"
                style={{
                  flex: 1,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <ExtractedTextPanel
                  extracts={extracts}
                  editingId={editingId}
                  selectedId={lockedByExtractId}
                  onUpdate={handleUpdateExtract}
                  onDelete={handleDeleteDefinition}
                  onSelection={handleRightSelection}
                  onToggleEdit={handleToggleEdit}
                  onOpenSemanticPanel={handleOpenSemanticPanel}
                  onEditDefinitionMeta={handleEditDefinitionMeta}
                />
              </Tabs.Panel>
            </Tabs>
          </Paper>
        ) : (
          <Flex
            gap={isTablet ? "md" : "lg"}
            style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
            direction={isTablet ? "column" : "row"}
          >
            <Paper
              flex={isTablet ? undefined : 1}
              shadow="xs"
              withBorder
              radius="md"
              style={{
                minHeight: isTablet ? "50%" : undefined,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Group
                px="md"
                py="sm"
                gap="xs"
                style={{
                  borderBottom: "1px solid var(--mantine-color-gray-2)",
                }}
              >
                <IconFileText size={16} color="var(--mantine-color-blue-6)" />
                <Text size="sm" fw={600} c="gray.7">
                  {document.filename}
                </Text>
                <Badge size="xs" variant="light" color="gray" ml="auto">
                  {pages.length} {pages.length === 1 ? "page" : "pages"}
                </Badge>
              </Group>
              <Box style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <DocumentPagesPanel
                  pages={pages}
                  onSelection={handleLeftSelection}
                />
              </Box>
            </Paper>

            <Paper
              w={isTablet ? undefined : 440}
              shadow="xs"
              withBorder
              radius="md"
              style={{
                minHeight: isTablet ? "50%" : undefined,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Group
                px="md"
                py="sm"
                gap="xs"
                style={{
                  borderBottom: "1px solid var(--mantine-color-gray-2)",
                }}
              >
                <IconList size={16} color="var(--mantine-color-teal-6)" />

                <Text size="sm" fw={600} c="gray.7">
                  Extracted Definitions
                </Text>

                {extracts.length > 0 && (
                  <Badge size="xs" variant="filled" color="teal" ml="auto">
                    {extracts.length}
                  </Badge>
                )}

                <Button
                  size="xs"
                  variant="subtle"
                  color="blue"
                  onClick={handleOpenLatexConfig}
                >
                  LaTeX
                </Button>
              </Group>
              <Box style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <ExtractedTextPanel
                  extracts={extracts}
                  editingId={editingId}
                  selectedId={lockedByExtractId}
                  onUpdate={handleUpdateExtract}
                  onDelete={handleDeleteDefinition}
                  onSelection={handleRightSelection}
                  onToggleEdit={handleToggleEdit}
                  onOpenSemanticPanel={handleOpenSemanticPanel}
                  onEditDefinitionMeta={handleEditDefinitionMeta}
                />
              </Box>
            </Paper>
          </Flex>
        )}
      </Stack>

      {popup && (
        <SelectionPopup
          popup={popup}
          onExtract={
            popup.source === "left"
              ? () => {
                  if (!selection) return;
                  setPendingExtractText(selection.text);
                  setExtractDialogOpen(true);
                  clearAll();
                }
              : undefined
          }
          onDefiniendum={
            popup.source === "right"
              ? () => {
                  if (!selection) return;

                  const extract = extracts.find(
                    (e) => e.id === selection.extractId,
                  );
                  if (!extract) return;

                  setDefExtractId(extract.id);
                  setDefExtractText(selection.text);
                  setDefDialogOpen(true);
                }
              : undefined
          }
          onSymbolicRef={
            popup.source === "right"
              ? () => {
                  if (!selection) return;
                  const extract = extracts.find(
                    (e) => e.id === selection.extractId,
                  );

                  if (!extract) return;

                  handleOpenSymbolicRef(extract.id);
                }
              : undefined
          }
          onClose={clearAll}
        />
      )}

      {mode === "SymbolicRef" && (
        <SymbolicRef
          conceptUri={conceptUri}
          onSelect={handleSaveSymbolicRef}
          onClose={handleCloseSymbolicRefDialog}
        />
      )}

      <DefiniendumDialog
        opened={defDialogOpen}
        extractedText={defExtractText}
        onClose={() => setDefDialogOpen(false)}
        onSubmit={handleDefiniendumSubmit}
      />

      <LatexConfigModel
        opened={latexConfigOpen}
        onClose={() => setLatexConfigOpen(false)}
        onSubmit={handleLatexConfigSubmit}
        extracts={extracts}
      />

      <SemanticPanel
        opened={semanticPanelOpen}
        onClose={() => setSemanticPanelOpen(false)}
        definition={extracts.find((e) => e.id === semanticPanelDefId) ?? null}
        onReplaceNode={handleReplaceNode}
        onDeleteNode={handleDeleteNode}
      />

      <ExtractTextDialog
        opened={extractDialogOpen}
        initialText={pendingExtractText}
        definitionName={definitionName}
        setDefinitionName={setDefinitionName}
        filePath={`${futureRepo}/ ${filePath}`}
        onClose={() => setExtractDialogOpen(false)}
        onSubmit={handleExtractSubmit}
      />

      <DefinitionIdentityDialog
        opened={definitionMetaEditOpen}
        onClose={() => {
          setDefinitionMetaEditOpen(false);
          setDefinitionMetaTarget(null);
        }}
        definition={definitionMetaTarget}
        invalidateKey={["definitions", documentId]}
      />
    </Box>
  );
}
