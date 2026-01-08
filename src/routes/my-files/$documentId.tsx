import { DefiniendumDialog } from "@/components/DefiniendumDialog";
import { DocumentHeader } from "@/components/DocumentHeader";
import { DocumentPagesPanel } from "@/components/DocumentPagesPanel";
import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { SelectionPopup } from "@/components/SelectionPopup";
import { SymbolicRef } from "@/components/SymbolicRef";
import { documentByIdQuery } from "@/queries/documentById";
import { documentPagesQuery } from "@/queries/documentPages";
import {
  ActivePage,
  buildDefiniendumMacro,
  replaceAllUnwrapped,
  useExtractionActions,
  useTextSelection,
  useValidation,
} from "@/server/text-selection";
import { currentUser } from "@/serverFns/currentUser.server";
import { createDefiniendum } from "@/serverFns/definiendum.server";
import { listExtractedText } from "@/serverFns/extractText.server";
import {
  ActionIcon,
  Box,
  Flex,
  Loader,
  Portal,
  Stack,
  Text,
} from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ParsedMathHubUri } from "@/server/parseUri";
import { createSymbolicRef } from "@/serverFns/symbolicRef.server";

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

  const { data: extracts = [] } = useQuery({
    queryKey: ["extracts", documentId],
    queryFn: () => listExtractedText({ data: { documentId } as any }),
  });

  const [futureRepo, setFutureRepo] = useState("Glox");
  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");
  const [language, setLanguage] = useState("en");
  const { errors, validate, clearError } = useValidation();

  const [activePage, setActivePage] = useState<ActivePage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [mode, setMode] = useState<"definition" | null>(null);
  const [conceptUri, setConceptUri] = useState<string>("");
  const [selectedUri, setSelectedUri] = useState<string>("");

  const [defDialogOpen, setDefDialogOpen] = useState(false);
  const [defExtractId, setDefExtractId] = useState<string | null>(null);
  const [defExtractText, setDefExtractText] = useState("");

  const { selection, popup, handleSelection, clearPopup } = useTextSelection();
  const { extractText, updateExtract } = useExtractionActions(documentId);

  function handleLeftSelection() {
    handleSelection("left", (text) => {
      const pageIndex = pages.findIndex((p) =>
        p.text.includes(text.substring(0, 50))
      );
      if (pageIndex !== -1) {
        setActivePage({
          id: pages[pageIndex].id,
          pageNumber: pages[pageIndex].pageNumber,
        });
      }
    });
  }

  function handleRightSelection() {
    handleSelection("right");
  }

  async function handleExtractToRight() {
    if (!activePage) return;
    if (!validate(futureRepo, filePath, fileName, language)) return;

    await extractText({
      documentPageId: activePage.id,
      pageNumber: activePage.pageNumber,
      text: selection,
      futureRepo: futureRepo.trim(),
      filePath: filePath.trim(),
      fileName: fileName.trim(),
      language: language.trim(),
    });

    clearPopup();
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
      } as any);
    }

    setDefDialogOpen(false);
    setDefExtractId(null);
    setDefExtractText("");
  }

  function handleOpenSymbolicRef() {
    setMode("definition");
    setConceptUri(selection);
    clearPopup();
  }

  function handleCloseSymbolicRefDialog() {
    setMode(null);
    setSelectedUri("");
  }

  async function handleSaveSymbolicRef(parsed: ParsedMathHubUri) {
    if (
      !validate(
        parsed.archive,
        parsed.filePath,
        parsed.fileName,
        parsed.language
      )
    ) {
      return;
    }
    await createSymbolicRef({
      data: {
        name: conceptUri,
        conceptUri: parsed.conceptUri,
        archive: parsed.archive,
        filePath: parsed.filePath,
        fileName: parsed.fileName,
        language: parsed.language,
      },
    } as any);

    handleCloseSymbolicRefDialog();
  }

  function handleToggleEdit(id: string) {
    setEditingId(editingId === id ? null : id);
  }

  async function handleUpdateExtract(id: string, statement: string) {
    await updateExtract(id, statement);
    setEditingId(null);
  }

  function handleNavigateToLatex() {
    navigate({
      to: "/create-latex",
      search: { documentId },
    });
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
      <DocumentHeader
        futureRepo={futureRepo}
        filePath={filePath}
        fileName={fileName}
        language={language}
        onFutureRepoChange={(value) => {
          setFutureRepo(value);
          clearError("futureRepo");
        }}
        onFilePathChange={(value) => {
          setFilePath(value);
          clearError("filePath");
        }}
        onFileNameChange={(value) => {
          setFileName(value);
          clearError("fileName");
        }}
        onLanguageChange={(value) => {
          setLanguage(value);
          clearError("language");
        }}
        errors={errors}
      />

      <Flex gap="md" style={{ flex: 1, minHeight: 0 }}>
        <Box flex={1} style={{ height: "100%" }}>
          <DocumentPagesPanel pages={pages} onSelection={handleLeftSelection} />
        </Box>

        <Box w={400}>
          <ExtractedTextPanel
            extracts={extracts}
            editingId={editingId}
            onToggleEdit={handleToggleEdit}
            onUpdate={handleUpdateExtract}
            onSelection={handleRightSelection}
          />
        </Box>
      </Flex>

      {popup && (
        <SelectionPopup
          popup={popup}
          onExtract={popup.source === "left" ? handleExtractToRight : undefined}
          onDefiniendum={
            popup.source === "right"
              ? () => {
                  const extract = extracts.find((e) =>
                    e.statement.includes(selection)
                  );
                  if (!extract) return;

                  setDefExtractId(extract.id);
                  setDefExtractText(selection);
                  setDefDialogOpen(true);
                  clearPopup();
                }
              : undefined
          }
          onSymbolicRef={
            popup.source === "right" ? handleOpenSymbolicRef : undefined
          }
          onClose={clearPopup}
        />
      )}

      {mode === "definition" && (
        <SymbolicRef
          conceptUri={conceptUri}
          selectedUri={selectedUri}
          onUriChange={setSelectedUri}
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
          onClick={handleNavigateToLatex}
        >
          <IconArrowRight size={22} />
        </ActionIcon>
      </Portal>
    </Box>
  );
}
