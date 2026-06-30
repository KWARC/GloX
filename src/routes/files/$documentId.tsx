import { currentUser } from "@/server/auth/currentUser";
import { deleteMarkReference } from "@/serverFns/markReference.server";
import { queryClient } from "@/queryClient";
import { useTextSelection } from "@/server/text-selection";
import { MarkReferenceLatexModal } from "@/components/MarkReferenceLatexModal";
import {
  buildMarkReferenceLatex,
  getMarkReferenceLatexDownloadName,
} from "@/lib/markReferenceLatex";
import {
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
  IconFileAlert,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileDialogs } from "./-components/FileDialogs";
import { FileDocumentLayout } from "./-components/FileDocumentLayout";
import { useDefinitionExtractionFlow } from "./-hooks/useDefinitionExtractionFlow";
import { useFileDocumentData } from "./-hooks/useFileDocumentData";
import {
  FlattenedLlmSuggestion,
  useLlmDefinitionSuggestions,
} from "./-hooks/useLlmDefinitionSuggestions";
import { useSemanticEditingFlow } from "./-hooks/useSemanticEditingFlow";
import { useSniffyReferenceSuggestions } from "./-hooks/useSniffyReferenceSuggestions";

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
  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTablet = useMediaQuery("(max-width: 1024px)");
  const [activeTab, setActiveTab] = useState<string | null>("document");
  const [markReferenceLatexOpen, setMarkReferenceLatexOpen] = useState(false);
  const [markReferenceLatex, setMarkReferenceLatex] = useState("");
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

  const extractionFlow = useDefinitionExtractionFlow({
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
    getSuggestionState: () => suggestionStateRef.current,
  });

  const llmFlow = useLlmDefinitionSuggestions({
    documentId,
    pages,
    extracts,
    isMobile,
    setActiveTab,
    openSuggestionForExtraction: extractionFlow.openSuggestionForExtraction,
  });

  suggestionStateRef.current = {
    flattenedSuggestions: llmFlow.flattenedSuggestions,
    focusedSuggestionIndex: llmFlow.focusedSuggestionIndex,
    focusSuggestion: llmFlow.focusSuggestion,
  };

  const sniffyFlow = useSniffyReferenceSuggestions({
    documentId,
    extracts,
    sniffyCatalog,
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
  const role = auth?.user?.role;
  const canAccessPrivilegedControls =
    role === "ADMIN" || role === "CURATOR";
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
          ? "Check whether any definitions were missed"
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
      {canAccessPrivilegedControls && (
        <Button
          size="xs"
          variant="light"
          color="indigo"
          onClick={() => setMarkReferenceLatexOpen(true)}
        >
          index.en.tex
        </Button>
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
            isMobile,
            isTablet,
            activeTab,
            setActiveTab,
          }}
          documentPanel={{
            documentId,
            document,
            pages,
            markReferencesByPage,
            deletingMarkReferenceId,
            llmButtons,
            llmSuggestions: llmFlow.llmSuggestions,
            llmEnabled: llmFlow.llmEnabled,
            focusedSuggestionId: llmFlow.focusedSuggestionId,
            onDeleteMarkReference: handleDeleteMarkReference,
            onSelection: extractionFlow.handleLeftSelection,
            onLlmSuggestionClick: llmFlow.handleLlmSuggestionClick,
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
            onEditDefinitionMeta: semanticFlow.handleEditDefinitionMeta,
            onOpenLatexConfig: semanticFlow.handleOpenLatexConfig,
            onCreateDefinition: extractionFlow.handleCreateDefinition,
            showJsonEdit: canAccessPrivilegedControls,
            showLatexButton: canAccessPrivilegedControls,
          }}
        />
      </Stack>

      <FileDialogs
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
            extractionFlow.handleCreateSymbolTargetDefinition(
              semanticFlow.conceptUri,
            );
          },
        }}
        definiendum={{
          opened: semanticFlow.defDialogOpen,
          extractedText: semanticFlow.defExtractText,
          onClose: () => semanticFlow.setDefDialogOpen(false),
          onSubmit: semanticFlow.handleDefiniendumSubmit,
        }}
        markReference={{
          opened: extractionFlow.markReferenceDialogOpen,
          extractedText: extractionFlow.markReferenceText,
          title: "Mark Reference",
          pickExistingSubmitLabel: "Save Mark Reference",
          createSubmitLabel: "Create",
          allowCreateSymbol: true,
          hideVerbalizationField: true,
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
            semanticFlow.setSemanticPanelDefId(null);
          },
          definition:
            extracts.find((e) => e.id === semanticFlow.semanticPanelDefId) ??
            null,
          onReplaceNode: semanticFlow.handleReplaceNode,
          onDeleteNode: semanticFlow.handleDeleteNode,
        }}
        extraction={{
          opened: extractionFlow.extractDialogOpen,
          initialText: extractionFlow.pendingExtractText,
          definitionName: extractionFlow.definitionName,
          definitionNameDisabled: false,
          kind: extractionFlow.extractKind,
          mode: extractionFlow.extractDialogMode,
          symbolName: extractionFlow.symbolName,
          symbolNameDisabled: extractionFlow.isMarkReferenceDefinitionFlow,
          setDefinitionName: extractionFlow.setDefinitionName,
          setKind: extractionFlow.setExtractKind,
          setSymbolName: extractionFlow.setSymbolName,
          filePath: `${semanticFlow.futureRepo}/ ${semanticFlow.filePath}`,
          title: extractionFlow.isMarkReferenceDefinitionFlow
            ? "Add Definition"
            : undefined,
          textLabel:
            extractionFlow.isManualDefinitionCreate ||
            extractionFlow.isMarkReferenceDefinitionFlow
              ? "Enter Definition"
              : undefined,
          textPlaceholder:
            extractionFlow.isManualDefinitionCreate ||
            extractionFlow.isMarkReferenceDefinitionFlow
              ? "Enter definition"
              : undefined,
          submitLabel: extractionFlow.isMarkReferenceDefinitionFlow
            ? "Add Definition"
            : undefined,
          hideSymbolNameField: extractionFlow.isMarkReferenceDefinitionFlow,
          enableSemanticAuthoring: extractionFlow.isManualDefinitionCreate,
          semanticEnabled: extractionFlow.semanticEnabled,
          setSemanticEnabled: extractionFlow.setSemanticEnabled,
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
          opened: semanticFlow.definitionMetaEditOpen,
          onClose: () => {
            semanticFlow.setDefinitionMetaEditOpen(false);
            semanticFlow.setDefinitionMetaTarget(null);
          },
          definition: semanticFlow.definitionMetaTarget,
          invalidateKey: ["definitions", documentId],
        }}
        sniffy={{
          opened: sniffyFlow.suggestOpen,
          onClose: () => sniffyFlow.setSuggestOpen(false),
          activeDefId: sniffyFlow.activeDefId,
          activeDefStatement: sniffyFlow.activeDefStatement,
          activeDefText: sniffyFlow.activeDefText,
          suggestions: sniffyFlow.suggestions,
          catalog: sniffyCatalog,
          loading: sniffyFlow.suggestLoading,
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
