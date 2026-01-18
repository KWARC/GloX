import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { DocumentHeader } from "@/components/DocumentHeader";
import { DocumentPagesPanel } from "@/components/DocumentPagesPanel";
import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { LatexConfigModel } from "@/components/LatexConfigModel";
import { SelectionPopup } from "@/components/SelectionPopup";
import { SymbolicRef } from "@/components/SymbolicRef";
import { documentByIdQuery } from "@/queries/documentById";
import { documentPagesQuery } from "@/queries/documentPages";
import { queryClient } from "@/queryClient";
import { currentUser } from "@/server/auth/currentUser";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  ActivePage,
  buildDefiniendumMacro,
  replaceAllUnwrapped,
  useExtractionActions,
  useTextSelection,
  useValidation,
} from "@/server/text-selection";
import { createDefiniendum } from "@/serverFns/definiendum.server";
import {
  deleteDefinition,
  listDefinition,
  updateDefinitionMeta,
} from "@/serverFns/extractDefinition.server";
import { resolveSymbolicRef } from "@/serverFns/resolveSymbolicRef.server";
import {
  ActionIcon,
  Box,
  Flex,
  Loader,
  Paper,
  Portal,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconArrowRight, IconFileText, IconList } from "@tabler/icons-react";
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
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");

  const { data: document, isLoading: docLoading } = useQuery(
    documentByIdQuery(documentId)
  );

  const { data: pages = [], isLoading: pagesLoading } = useQuery(
    documentPagesQuery(documentId)
  );

  const { data: extracts = [] } = useQuery({
    queryKey: ["definitions", documentId],
    queryFn: () => listDefinition({ data: { documentId } }),
  });

  const [futureRepo, setFutureRepo] = useState("smglom/softeng");
  const [filePath, setFilePath] = useState("mod");
  const [fileName, setFileName] = useState("Software");
  const [language, setLanguage] = useState("en");
  const { errors, validate, clearError } = useValidation();

  const [activePage, setActivePage] = useState<ActivePage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [mode, setMode] = useState<"SymbolicRef" | null>(null);
  const [conceptUri, setConceptUri] = useState<string>("");

  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [defExtractId, setDefExtractId] = useState<string | null>(null);
  const [defExtractText, setDefExtractText] = useState("");
  const [lockedByExtractId, setLockedByExtractId] = useState<string | null>(
    null
  );

  const [latexConfigOpen, setLatexConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("document");
  const [isEditingMeta, setIsEditingMeta] = useState(false);

  async function handleDeleteDefinition(id: string) {
    if (!confirm("Delete this extracted definition?")) return;

    await deleteDefinition({ data: { id } });
  }
  const { selection, popup, handleSelection, clearPopupOnly, clearAll } =
    useTextSelection();

  const { extractText, updateExtract } = useExtractionActions(documentId);

  function handleLeftSelection(pageId: string) {
    setLockedByExtractId(null);

    if (!lockedByExtractId) {
      const ok = validate(futureRepo, filePath, fileName, language);
      if (!ok) return;
    }

    handleSelection("left");

    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    setActivePage({
      id: page.id,
      pageNumber: page.pageNumber,
    });
  }

  function handleRightSelection(extractId: string) {
    const extract = extracts.find((e) => e.id === extractId);
    if (!extract) return;

    setFutureRepo(extract.futureRepo);
    setFilePath(extract.filePath);
    setFileName(extract.fileName);
    setLanguage(extract.language);

    setLockedByExtractId(extractId);
    setIsEditingMeta(false);

    clearError("futureRepo");
    clearError("filePath");
    clearError("fileName");
    clearError("language");

    handleSelection("right", { extractId });
  }

  async function handleExtractToRight() {
    if (!activePage) return;
    if (!validate(futureRepo, filePath, fileName, language)) return;
    if (!selection) return;

    await extractText({
      documentPageId: activePage.id,
      pageNumber: activePage.pageNumber,
      text: selection.text,
      futureRepo: futureRepo.trim(),
      filePath: filePath.trim(),
      fileName: fileName.trim(),
      language: language.trim(),
    });

    clearAll();
  }

  async function handleDefiniendumSubmit(params: {
    symbolName: string;
    alias: string;
    symdecl: boolean;
  }) {
    if (!defExtractId) return;
    if (!validate(futureRepo, filePath, fileName, language)) return;

    const extract = extracts.find((e) => e.id === defExtractId);
    if (!extract) return;

    const macro = buildDefiniendumMacro(params.symbolName, params.alias);

    const updatedStatement = replaceAllUnwrapped(
      extract.statement,
      defExtractText,
      macro
    );

    await updateExtract(defExtractId, updatedStatement);

    if (params.symdecl) {
      await createDefiniendum({
        data: {
          symbolName: params.symbolName.trim(),
          alias: params.alias?.trim() || null,
          symbolDeclared: params.symdecl,
          futureRepo: futureRepo.trim(),
          filePath: filePath.trim(),
          fileName: fileName.trim(),
          language: language.trim(),
        },
      });
    }

    setDefDialogOpen(false);
    setDefExtractId(null);
    setDefExtractText("");
  }

  function handleOpenSymbolicRef(extractId: string) {
    if (!selection) return;

    if (selection.isWholeStatement) {
      console.warn("[SymbolicRef] Invalid selection");
      return;
    }

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

  async function handleSaveSymbolicRef(symRef: UnifiedSymbolicReference) {
    if (!defExtractId || !selection) return;

    await resolveSymbolicRef({
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

    handleCloseSymbolicRefDialog();
  }

  function handleToggleEdit(id: string) {
    setEditingId(editingId === id ? null : id);
  }

  async function handleSaveHeaderMeta() {
    if (!lockedByExtractId) return;

    const ok = validate(futureRepo, filePath, fileName, language);
    if (!ok) return;

    await updateDefinitionMeta({
      data: {
        id: lockedByExtractId,
        futureRepo: futureRepo.trim(),
        filePath: filePath.trim(),
        fileName: fileName.trim(),
        language: language.trim(),
      },
    });

    queryClient.setQueryData(
      ["definitions", documentId],
      (old: any[] | undefined) => {
        if (!old) return old;

        return old.map((item) =>
          item.id === lockedByExtractId
            ? {
                ...item,
                futureRepo: futureRepo.trim(),
                filePath: filePath.trim(),
                fileName: fileName.trim(),
                language: language.trim(),
              }
            : item
        );
      }
    );

    setIsEditingMeta(false);
  }

  async function handleUpdateExtract(id: string, statement: string) {
    await updateExtract(id, statement);
    setEditingId(null);
  }

  function handleOpenLatexConfig() {
    setLatexConfigOpen(true);
  }

  function handleLatexConfigSubmit(config: {
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  }) {
    navigate({
      to: "/create-latex",
      search: {
        documentId,
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
      <Stack align="center" justify="center" h="100vh">
        <Loader size="lg" />
        <Text c="dimmed">Loading document...</Text>
      </Stack>
    );
  }

  if (!document) {
    return (
      <Stack align="center" justify="center" h="100vh">
        <Text size="xl" fw={500} c="red">
          Document not found
        </Text>
      </Stack>
    );
  }

  return (
    <Box
      h="100%"
      p={isMobile ? "sm" : isTablet ? "md" : "lg"}
      style={{ overflow: "hidden" }}
    >
      <Stack
        gap={isMobile ? "sm" : "md"}
        h="100%"
        style={{ overflow: "hidden" }}
      >
        <Paper shadow="xs" p={isMobile ? "sm" : "md"} withBorder>
          <DocumentHeader
            futureRepo={futureRepo}
            filePath={filePath}
            fileName={fileName}
            language={language}
            disabled={lockedByExtractId ? !isEditingMeta : false}
            canEdit={!!lockedByExtractId}
            onEditMeta={() => setIsEditingMeta(true)}
            onSaveMeta={handleSaveHeaderMeta}
            onFutureRepoChange={setFutureRepo}
            onFilePathChange={setFilePath}
            onFileNameChange={setFileName}
            onLanguageChange={setLanguage}
            errors={errors}
          />
        </Paper>

        {isMobile ? (
          <Paper
            flex={1}
            shadow="sm"
            withBorder
            style={{
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab
                  value="document"
                  leftSection={<IconFileText size={16} />}
                >
                  Document
                </Tabs.Tab>
                <Tabs.Tab value="extracts" leftSection={<IconList size={16} />}>
                  Extracts
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel
                value="document"
                pt="xs"
                style={{
                  height: "100%",
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
                  height: "100%",
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <ExtractedTextPanel
                  extracts={extracts}
                  editingId={editingId}
                  onUpdate={handleUpdateExtract}
                  onDelete={handleDeleteDefinition}
                  onSelection={handleRightSelection}
                  onToggleEdit={handleToggleEdit}
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
              shadow="sm"
              withBorder
              style={{
                minHeight: isTablet ? "50%" : undefined,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <DocumentPagesPanel
                pages={pages}
                onSelection={handleLeftSelection}
              />
            </Paper>

            <Paper
              w={isTablet ? undefined : 420}
              shadow="sm"
              withBorder
              style={{
                minHeight: isTablet ? "50%" : undefined,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ExtractedTextPanel
                extracts={extracts}
                editingId={editingId}
                onUpdate={handleUpdateExtract}
                onDelete={handleDeleteDefinition}
                onSelection={handleRightSelection}
                onToggleEdit={handleToggleEdit}
              />
            </Paper>
          </Flex>
        )}
      </Stack>

      {popup && (
        <SelectionPopup
          popup={popup}
          onExtract={popup.source === "left" ? handleExtractToRight : undefined}
          onDefiniendum={
            popup.source === "right"
              ? () => {
                  if (!selection) return;
                  const extract = extracts.find(
                    (e) => e.id === selection.extractId
                  );
                  if (!extract) return;

                  setDefExtractId(extract.id);
                  setDefExtractText(selection.text);
                  setDefDialogOpen(true);
                  clearAll();
                }
              : undefined
          }
          onSymbolicRef={
            popup.source === "right"
              ? () => {
                  if (!selection) return;
                  const extract = extracts.find(
                    (e) => e.id === selection.extractId
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
        key={defExtractText}
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

      <Portal>
        <ActionIcon
          size={isMobile ? "lg" : "xl"}
          radius="xl"
          variant="filled"
          color="blue"
          pos="fixed"
          bottom={isMobile ? 16 : 24}
          right={isMobile ? 16 : 24}
          style={{ zIndex: 5000 }}
          onClick={handleOpenLatexConfig}
        >
          <IconArrowRight size={isMobile ? 18 : 22} />
        </ActionIcon>
      </Portal>
    </Box>
  );
}
