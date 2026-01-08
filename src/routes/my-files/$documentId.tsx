import { DefinitionDialog } from "@/components/DefinitionDialog";
import { DocumentHeader } from "@/components/DocumentHeader";
import { DocumentPagesPanel } from "@/components/DocumentPagesPanel";
import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { SelectionPopup } from "@/components/SelectionPopup";
import { documentByIdQuery } from "@/queries/documentById";
import { documentPagesQuery } from "@/queries/documentPages";
import {
  ActivePage,
  useExtractionActions,
  useTextSelection,
  useValidation,
} from "@/server/text-selection";
import { currentUser } from "@/serverFns/currentUser.server";
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

  const { data: extracts = [] } = useQuery({
    queryKey: ["extracts", documentId],
    queryFn: () => listExtractedText({ data: { documentId } as any }),
  });

  const [futureRepo, setFutureRepo] = useState("Glox");
  const [filePath, setFilePath] = useState("");
  const { errors, validate, clearError } = useValidation();

  const [activePage, setActivePage] = useState<ActivePage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [mode, setMode] = useState<"definition" | null>(null);
  const [conceptUri, setConceptUri] = useState<string>("");
  const [selectedUri, setSelectedUri] = useState<string>("");

  const { selection, popup, handleSelection, clearPopup } = useTextSelection();
  const { extractText, saveDefiniendum, updateExtract } =
    useExtractionActions(documentId);

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
    if (!validate(futureRepo, filePath)) return;

    await extractText({
      documentPageId: activePage.id,
      pageNumber: activePage.pageNumber,
      text: selection,
      futureRepo: futureRepo.trim(),
      filePath: filePath.trim(),
    });

    clearPopup();
  }

  async function handleSaveDefiniendum() {
    if (!validate(futureRepo, filePath)) return;

    await saveDefiniendum({
      symbolName: selection,
      futureRepo: futureRepo.trim(),
      filePath: filePath.trim(),
    });

    clearPopup();
  }

  function handleOpenSymbolicRef() {
    setMode("definition");
    setConceptUri(selection);
    clearPopup();
  }

  function handleCloseDefinitionDialog() {
    setMode(null);
    setSelectedUri("");
  }

  function handleUriSelect() {
    console.log("Selected URI:", selectedUri);
    handleCloseDefinitionDialog();
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
        onFutureRepoChange={(value) => {
          setFutureRepo(value);
          clearError("futureRepo");
        }}
        onFilePathChange={(value) => {
          setFilePath(value);
          clearError("filePath");
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
            popup.source === "right" ? handleSaveDefiniendum : undefined
          }
          onSymbolicRef={
            popup.source === "right" ? handleOpenSymbolicRef : undefined
          }
          onClose={clearPopup}
        />
      )}

      {mode === "definition" && (
        <DefinitionDialog
          conceptUri={conceptUri}
          selectedUri={selectedUri}
          onUriChange={setSelectedUri}
          onSelect={handleUriSelect}
          onClose={handleCloseDefinitionDialog}
        />
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
          onClick={handleNavigateToLatex}
        >
          →
        </ActionIcon>
      </Portal>
    </Box>
  );
}
