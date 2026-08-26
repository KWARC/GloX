import { DocumentLocationDialog } from "@/components/DocumentLocationDialog";
import { FileDialogs } from "@/components/files/FileDialogs";
import { FileDocumentLayout } from "@/components/files/FileDocumentLayout";
import { FileDocumentSkeleton } from "@/components/files/FileDocumentSkeleton";
import { MarkReferenceLatexModal } from "@/components/MarkReferenceLatexModal";
import { useFloDownBlockExtractionFlow } from "@/hooks/files/useFloDownBlockExtractionFlow";
import { useFileDocumentData } from "@/hooks/files/useFileDocumentData";
import { useFileSniffyReferenceSuggestions } from "@/hooks/files/useFileSniffyReferenceSuggestions";
import {
  FlattenedLlmSuggestion,
  useLlmFloDownBlockSuggestions,
} from "@/hooks/files/useLlmFloDownBlockSuggestions";
import { useSemanticEditingFlow } from "@/hooks/files/useSemanticEditingFlow";
import {
  buildMarkReferenceLatex,
  getMarkReferenceLatexDownloadName,
} from "@/lib/markReferenceLatex";
import { queryClient } from "@/queryClient";
import { currentUser } from "@/server/auth/currentUser";
import { useTextSelection } from "@/server/text-selection";
import { deleteMarkReference } from "@/serverFns/markReference.server";
import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconBrain,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconFileAlert,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/files/$documentId")({
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
  const { data: auth } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
    staleTime: 60_000,
  });
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const [markReferenceLatexOpen, setMarkReferenceLatexOpen] = useState(false);
  const [markReferenceLatex, setMarkReferenceLatex] = useState("");
  const [moveLocationOpen, setMoveLocationOpen] = useState(false);
  const [persistentHighlightsEnabled, setPersistentHighlightsEnabled] =
    useState(true);
  const [sourcePageTarget, setSourcePageTarget] = useState<{
    pageNumber: number;
    requestedAt: number;
  } | null>(null);
  const [deletingMarkReferenceId, setDeletingMarkReferenceId] = useState<
    string | null
  >(null);
  const suggestionStateRef = useRef<{
    flattenedSuggestions: FlattenedLlmSuggestion[];
    focusedSuggestionIndex: number | null;
    focusSuggestion: (index: number) => void;
  }>({
    flattenedSuggestions: [],
    focusedSuggestionIndex: null,
    focusSuggestion: () => undefined,
  });
  const { selection, popup, handleSelection, clearPopupOnly, clearAll } =
    useTextSelection();

  const {
    document,
    pages,
    extracts,
    markReferences,
    sniffyCatalog,
    staticCatalogLoading,
    staticCatalogError,
    retryStaticCatalog,
    docLoading,
    pagesLoading,
  } = useFileDocumentData(documentId);

  const semanticFlow = useSemanticEditingFlow({
    documentId,
    extracts,
    selection,
    handleSelection,
    clearPopupOnly,
    clearAll,
    navigate,
  });

  useEffect(() => {
    if (!document) return;
    semanticFlow.setFutureRepo(document.futureRepo);
    semanticFlow.setFilePath(document.filePath);
    semanticFlow.setLanguage(document.language);
  }, [document?.id]);

  const extractionFlow = useFloDownBlockExtractionFlow({
    documentId,
    document,
    pages,
    selection,
    handleSelection,
    clearPopupOnly,
    clearAll,
    lockedByExtractId: semanticFlow.lockedByExtractId,
    setLockedByExtractId: semanticFlow.setLockedByExtractId,
    validateIdentity: semanticFlow.validateIdentity,
    identity: {
      futureRepo: semanticFlow.futureRepo,
      filePath: semanticFlow.filePath,
      language: semanticFlow.language,
    },
    getSuggestionState: () => suggestionStateRef.current,
  });

  const llmFlow = useLlmFloDownBlockSuggestions({
    documentId,
    pages,
    extracts,
    openSuggestionForExtraction: extractionFlow.openSuggestionForExtraction,
  });

  suggestionStateRef.current = {
    flattenedSuggestions: llmFlow.flattenedSuggestions,
    focusedSuggestionIndex: llmFlow.focusedSuggestionIndex,
    focusSuggestion: llmFlow.focusSuggestion,
  };

  const sniffyFlow = useFileSniffyReferenceSuggestions({
    documentId,
    extracts,
    sniffyCatalog,
    staticCatalogLoading,
    staticCatalogError,
    retryStaticCatalog,
  });

  const markReferencesByPage = useMemo(
    () =>
      markReferences.reduce<Record<string, typeof markReferences>>(
        (acc, reference) => {
          const current = acc[reference.documentPageId] ?? [];
          current.push(reference);
          acc[reference.documentPageId] = current;
          return acc;
        },
        {},
      ),
    [markReferences],
  );

  const extractsByPageNumber = useMemo(
    () =>
      extracts.reduce<Record<number, typeof extracts>>((acc, extract) => {
        if (extract.pageNumber === null) return acc;

        const current = acc[extract.pageNumber] ?? [];
        current.push(extract);
        acc[extract.pageNumber] = current;
        return acc;
      }, {}),
    [extracts],
  );

  async function handleDeleteMarkReference(referenceId: string) {
    setDeletingMarkReferenceId(referenceId);
    try {
      await deleteMarkReference({ data: { id: referenceId } });
      await queryClient.invalidateQueries({
        queryKey: ["mark-references", documentId],
      });
    } finally {
      setDeletingMarkReferenceId(null);
    }
  }

  useEffect(() => {
    if (!document) {
      setMarkReferenceLatex("");
      return;
    }

    let cancelled = false;

    const fileName = document.filename.replace(/\.[^.]+$/, "");

    buildMarkReferenceLatex(
      {
        futureRepo: document.futureRepo,
        filePath: document.filePath,
        fileName,
        language: document.language,
      },
      markReferences,
    ).then((latex) => {
      if (!cancelled) setMarkReferenceLatex(latex);
    });

    return () => {
      cancelled = true;
    };
  }, [document, markReferences]);

  if (docLoading || pagesLoading) {
    return <FileDocumentSkeleton />;
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

  const pad = isTablet ? "md" : "lg";
  const gap = "md";
  const role = auth?.user?.role;
  const canAccessPrivilegedControls = role === "ADMIN" || role === "CURATOR";
  const totalSuggestions = llmFlow.flattenedSuggestions.length;
  const hasAnySuggestions = totalSuggestions > 0;
  const suggestionCounter =
    llmFlow.focusedSuggestionIndex === null
      ? 1
      : llmFlow.focusedSuggestionIndex + 1;
  const hasExtractedDefinitions = extracts.length > 0;

  const didIMissSomethingButton = hasExtractedDefinitions ? (
    <Tooltip
      label={
        llmFlow.canRunLlm
          ? "Check whether any content was missed"
          : "Document is loading…"
      }
      withArrow
      position="bottom"
    >
      <Button
        size="xs"
        variant="light"
        color="teal"
        leftSection={
          llmFlow.llmLoading ? (
            <Loader size={12} color="teal" />
          ) : (
            <IconBrain size={14} />
          )
        }
        loading={llmFlow.llmLoading}
        disabled={!llmFlow.canRunLlm}
        onClick={llmFlow.handleDidIMissSomething}
      >
        Did I miss something?
      </Button>
    </Tooltip>
  ) : null;

  const suggestionControls =
    hasAnySuggestions && !llmFlow.llmSuggestionsDismissed ? (
      <>
        <Group gap={2} wrap="nowrap">
          <Tooltip label="Previous suggestion" withArrow position="bottom">
            <Button
              size="xs"
              variant="subtle"
              color="yellow"
              px={6}
              onClick={() => llmFlow.goToSuggestion("previous")}
            >
              <IconChevronLeft size={14} />
            </Button>
          </Tooltip>

          <Text size="xs" c="dimmed" miw={42} ta="center">
            {suggestionCounter} / {totalSuggestions}
          </Text>

          <Tooltip label="Next suggestion" withArrow position="bottom">
            <Button
              size="xs"
              variant="subtle"
              color="yellow"
              px={6}
              onClick={() => llmFlow.goToSuggestion("next")}
            >
              <IconChevronRight size={14} />
            </Button>
          </Tooltip>
        </Group>

        <Tooltip
          label={llmFlow.llmEnabled ? "Hide suggestions" : "Show suggestions"}
          withArrow
          position="bottom"
        >
          <Button
            size="xs"
            variant={llmFlow.llmEnabled ? "filled" : "outline"}
            color="yellow"
            leftSection={<IconSparkles size={13} />}
            onClick={() => llmFlow.setLlmEnabled(!llmFlow.llmEnabled)}
          >
            {totalSuggestions}
          </Button>
        </Tooltip>

        <Tooltip label="Dismiss suggestions" withArrow position="bottom">
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            px={6}
            onClick={llmFlow.handleDismissSuggestions}
          >
            <IconX size={14} />
          </Button>
        </Tooltip>
      </>
    ) : (
      didIMissSomethingButton
    );

  const llmButtons = (
    <Group gap={6} wrap="nowrap">
      <Tooltip
        label={
          persistentHighlightsEnabled
            ? "Hide extracted text highlights"
            : "Show extracted text highlights"
        }
        withArrow
        position="bottom"
      >
        <ActionIcon
          size="sm"
          variant="subtle"
          color="blue"
          aria-label={
            persistentHighlightsEnabled
              ? "Hide extracted text highlights"
              : "Show extracted text highlights"
          }
          onClick={() =>
            setPersistentHighlightsEnabled(!persistentHighlightsEnabled)
          }
        >
          {persistentHighlightsEnabled ? (
            <IconEye size={15} />
          ) : (
            <IconEyeOff size={15} />
          )}
        </ActionIcon>
      </Tooltip>
      {canAccessPrivilegedControls && (
        <Tooltip
          label={
            markReferences.length === 0
              ? "No marked references yet"
              : "Preview index.en.tex"
          }
          withArrow
          position="bottom"
        >
          <span>
            <Button
              size="xs"
              variant="light"
              color="indigo"
              disabled={markReferences.length === 0}
              onClick={() => setMarkReferenceLatexOpen(true)}
            >
              index.en.tex
            </Button>
          </span>
        </Tooltip>
      )}
      {suggestionControls}
    </Group>
  );

  const handleDownloadMarkReferenceLatex = () => {
    const blob = new Blob([markReferenceLatex], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = getMarkReferenceLatexDownloadName(document.filename);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box h="100%" p={pad} style={{ overflow: "hidden" }}>
      <Stack gap={gap} h="100%" style={{ overflow: "hidden" }}>
        <FileDocumentLayout
          responsive={{
            isTablet,
          }}
          documentPanel={{
            documentId,
            document,
            pages,
            extractsByPageNumber,
            persistentHighlightsEnabled,
            markReferencesByPage,
            deletingMarkReferenceId,
            llmButtons,
            llmSuggestions: llmFlow.llmSuggestions,
            llmEnabled: llmFlow.llmEnabled,
            focusedSuggestionId: llmFlow.focusedSuggestionId,
            sourcePageTarget,
            onDeleteMarkReference: handleDeleteMarkReference,
            onSelection: extractionFlow.handleLeftSelection,
            onLlmSuggestionClick: llmFlow.handleLlmSuggestionClick,
            onMoveLocation: () => setMoveLocationOpen(true),
          }}
          extractsPanel={{
            extracts,
            editingId: semanticFlow.editingId,
            selectedId: semanticFlow.lockedByExtractId,
            onUpdate: semanticFlow.handleUpdateExtract,
            onDelete: semanticFlow.handleDeleteDefinition,
            onSelection: semanticFlow.handleRightSelection,
            onToggleEdit: semanticFlow.handleToggleEdit,
            onOpenSemanticPanel: semanticFlow.handleOpenSemanticPanel,
            onRecomputeReferences: sniffyFlow.handleRecomputeReferences,
            onEditFloDownBlockMeta: semanticFlow.handleEditFloDownBlockMeta,
            onOpenLatexConfig: semanticFlow.handleOpenLatexConfig,
            onCreateDefinition: extractionFlow.handleCreateDefinition,
            onGoToSourcePage: (pageNumber) =>
              setSourcePageTarget({ pageNumber, requestedAt: Date.now() }),
            showJsonEdit: canAccessPrivilegedControls,
            showLatexButton: canAccessPrivilegedControls,
          }}
        />
      </Stack>

      <FileDialogs
        deletion={{
          floDownBlock: semanticFlow.deleteTarget,
          loading: semanticFlow.deleteLoading,
          onCancel: () => semanticFlow.setDeleteTarget(null),
          onConfirm: semanticFlow.confirmDeleteDefinition,
        }}
        selection={{
          popup,
          onClosePopup: clearAll,
          onExtractSelection: extractionFlow.handleOpenSelectionExtract,
          onMarkReferenceSelection: extractionFlow.handleOpenMarkReference,
          onDefiniendumSelection: semanticFlow.openDefiniendumFromSelection,
          onSymbolicRefSelection: semanticFlow.openSymbolicRefFromSelection,
          allowDefiniendumSelection:
            semanticFlow.canOpenDefiniendumFromSelection,
        }}
        symbolicRef={{
          mode: semanticFlow.mode,
          conceptUri: semanticFlow.conceptUri,
          hidden:
            (extractionFlow.extractDialogOpen &&
              extractionFlow.extractDialogMode === "symbol-target") ||
            !!extractionFlow.createdSymbolTarget,
          loading: semanticFlow.symbolicRefSaving,
          onSave: semanticFlow.handleSaveSymbolicRef,
          onClose: semanticFlow.handleCloseSymbolicRefDialog,
          onCreateSymbol: () => {
            extractionFlow.handleCreateSymbolTargetFloDownBlock(
              semanticFlow.conceptUri,
            );
          },
        }}
        definiendum={{
          opened: semanticFlow.defDialogOpen,
          extractedText: semanticFlow.floDownBlockExtractText,
          onClose: () => semanticFlow.setDefDialogOpen(false),
          onSubmit: semanticFlow.handleDefiniendumSubmit,
        }}
        markReference={{
          opened: extractionFlow.markReferenceDialogOpen,
          extractedText: extractionFlow.markReferenceText,
          title: "Mark Reference",
          pickExistingSubmitLabel: "Save Mark Reference",
          createSubmitLabel: "Add Mark Reference",
          allowCreateSymbol: true,
          loading: extractionFlow.markReferenceSaving,
          onClose: extractionFlow.handleCloseMarkReference,
          onSubmit: extractionFlow.handleMarkReferenceSubmit,
        }}
        latex={{
          opened: semanticFlow.latexConfigOpen,
          onClose: () => semanticFlow.setLatexConfigOpen(false),
          onSubmit: semanticFlow.handleLatexConfigSubmit,
          extracts,
        }}
        semantic={{
          opened: semanticFlow.semanticPanelOpen,
          onClose: () => {
            semanticFlow.setSemanticPanelOpen(false);
            semanticFlow.setSemanticPanelFloDownBlockId(null);
          },
          floDownBlock:
            extracts.find((e) => e.id === semanticFlow.semanticPanelFloDownBlockId) ??
            null,
          onReplaceNode: semanticFlow.handleReplaceNode,
          onDeleteNode: semanticFlow.handleDeleteNode,
        }}
        extraction={{
          opened: extractionFlow.extractDialogOpen,
          initialText: extractionFlow.pendingExtractText,
          paragraphFileName: extractionFlow.paragraphFileName,
          paragraphFileNameDisabled: false,
          blockType: extractionFlow.extractBlockType,
          mode: extractionFlow.extractDialogMode,
          symbolName: extractionFlow.symbolName,
          symbolNameDisabled: extractionFlow.isMarkReferenceDefinitionFlow,
          setParagraphFileName: extractionFlow.setParagraphFileName,
          setBlockType: extractionFlow.setExtractBlockType,
          setSymbolName: extractionFlow.setSymbolName,
          identity: {
            futureRepo: semanticFlow.futureRepo,
            filePath: semanticFlow.filePath,
            language: semanticFlow.language,
          },
          location: {
            futureRepo: semanticFlow.futureRepo,
            filePath: semanticFlow.filePath,
            language: semanticFlow.language,
            setFutureRepo: semanticFlow.setFutureRepo,
            setFilePath: semanticFlow.setFilePath,
            setLanguage: semanticFlow.setLanguage,
          },
          title: extractionFlow.isMarkReferenceDefinitionFlow
            ? "Add Content"
            : undefined,
          textLabel:
            extractionFlow.isManualDefinitionCreate ||
            extractionFlow.isMarkReferenceDefinitionFlow
              ? "Enter Content"
              : undefined,
          textPlaceholder:
            extractionFlow.isManualDefinitionCreate ||
            extractionFlow.isMarkReferenceDefinitionFlow
              ? "Enter content"
              : undefined,
          submitLabel: extractionFlow.isMarkReferenceDefinitionFlow
            ? "Add Content"
            : undefined,
          hideSymbolNameField: extractionFlow.isMarkReferenceDefinitionFlow,
          createSymbolFlow:
            extractionFlow.extractDialogMode === "symbol-target" &&
            !extractionFlow.isMarkReferenceDefinitionFlow,
          enableSemanticAuthoring: true,
          semanticEnabled: extractionFlow.semanticEnabled,
          setSemanticEnabled: extractionFlow.setSemanticEnabled,
          duplicateFloDownBlocks: extractionFlow.duplicateFloDownBlocks,
          onCancelDuplicate: () => extractionFlow.setDuplicateFloDownBlocks([]),
          onConfirmDuplicate: extractionFlow.confirmDuplicateCreation,
          onClose: extractionFlow.handleCloseExtractDialog,
          onSubmit: extractionFlow.handleExtractSubmit,
        }}
        createdSymbolDefiniendum={{
          opened: !!extractionFlow.createdSymbolTarget,
          target: extractionFlow.createdSymbolTarget,
          onClose: () => {
            extractionFlow.setCreatedSymbolTarget(null);
          },
          onConfirm: extractionFlow.handleDeclareCreatedSymbolDefiniendum,
        }}
        metadata={{
          opened: semanticFlow.floDownBlockMetaEditOpen,
          onClose: () => {
            semanticFlow.setFloDownBlockMetaEditOpen(false);
            semanticFlow.setFloDownBlockMetaTarget(null);
          },
          floDownBlock: semanticFlow.floDownBlockMetaTarget,
          invalidateKey: ["floDownBlocks", documentId],
        }}
        sniffy={{
          opened: sniffyFlow.suggestOpen,
          onClose: () => sniffyFlow.setSuggestOpen(false),
          activeFloDownBlockId: sniffyFlow.activeFloDownBlockId,
          activeFloDownBlockStatement: sniffyFlow.activeFloDownBlockStatement,
          activeDeclaredSymbolsInfo: sniffyFlow.activeDeclaredSymbolsInfo,
          activeFloDownBlockText: sniffyFlow.activeFloDownBlockText,
          suggestions: sniffyFlow.suggestions,
          catalog: sniffyCatalog,
          loading: sniffyFlow.suggestLoading,
          catalogError: sniffyFlow.catalogError,
          onRetryCatalog: sniffyFlow.handleRetryCatalog,
          onAccept: sniffyFlow.handleAcceptSuggestion,
        }}
        recompute={{
          opened: llmFlow.recomputeDialogOpen,
          onClose: () => llmFlow.setRecomputeDialogOpen(false),
          promptDraft: llmFlow.recomputePromptDraft,
          setPromptDraft: llmFlow.setRecomputePromptDraft,
          llmLoading: llmFlow.llmLoading,
          pagesLength: pages.length,
          onSubmit: llmFlow.handleRecomputeSubmit,
        }}
      />
      <DocumentLocationDialog
        document={document ?? null}
        opened={moveLocationOpen}
        onClose={() => setMoveLocationOpen(false)}
      />

      <MarkReferenceLatexModal
        opened={markReferenceLatexOpen}
        code={markReferenceLatex}
        fileName={getMarkReferenceLatexDownloadName(document.filename)}
        onClose={() => setMarkReferenceLatexOpen(false)}
        onDownload={handleDownloadMarkReferenceLatex}
      />
    </Box>
  );
}
