import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { UploadAttributionInfo } from "@/components/UploadAttributionInfo";
import { FileIdentity } from "@/serverFns/latex.server";
import { Box, Group, Loader, Stack, Table } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { DiscardFloDownBlockModal } from "./DiscardFloDownBlockModal";
import { LatexPreviewModal } from "./LatexPreviewModal";
import { StexCurationDialogs } from "./StexCurationDialogs";
import { StexCurationFooter } from "./StexCurationFooter";
import { StexStatusMenu } from "./StexStatusMenu";
import { SymbolDeclaredSection } from "./SymbolDeclaredSection";
import { useStexCurationActions } from "@/hooks/stex-curation/useStexCurationActions";
import { useStexCurationData } from "@/hooks/stex-curation/useStexCurationData";
import { useStexSemanticFlow } from "@/hooks/stex-curation/useStexSemanticFlow";
import { useStexSniffyFlow } from "@/hooks/stex-curation/useStexSniffyFlow";
import { FloDownBlockDeleteModal, DuplicateFloDownBlockModal } from "@/components/FloDownBlockReviewModals";
import { ExtractedItem } from "@/server/text-selection";
import { queryClient } from "@/queryClient";
import { useState } from "react";

export function StexCuration({ identity }: { identity: FileIdentity }) {
  const [deleteTarget, setDeleteTarget] = useState<ExtractedItem | null>(null);
  const navigate = useNavigate();
  const curationData = useStexCurationData(identity);
  const {
    floDownBlocks,
    isLoading,
    floDownBlockIds,
    provenance,
    sniffyCatalog,
    staticCatalogLoading,
    staticCatalogError,
    retryStaticCatalog,
    floDownBlockSymbolSummaries,
    status,
    statusConf,
    discardReasonFromServer,
  } = curationData;
  const sniffyFlow = useStexSniffyFlow(
    identity,
    floDownBlocks,
    sniffyCatalog,
    staticCatalogLoading,
    staticCatalogError,
    retryStaticCatalog,
  );
  const semanticFlow = useStexSemanticFlow(identity, floDownBlocks);
  const actions = useStexCurationActions(identity, floDownBlockIds, provenance);
  const latexReadOnly =
    status === "SUBMITTED_TO_MATHHUB" || status === "DISCARDED";
  const latexSaveDisabled =
    status === "FINALIZED_IN_FILE" ||
    status === "SUBMITTED_TO_MATHHUB" ||
    status === "DISCARDED";
  const isLocked = status === "SUBMITTED_TO_MATHHUB" || status === "DISCARDED";
  const symbolSummaryMap = new Map(
    floDownBlockSymbolSummaries.map((summary) => [summary.floDownBlockId, summary]),
  );

  return (
    <>
      <Table.Tr>
        <Table.Td colSpan={4} p={0}>
          <Box px="sm" py="xs">
            {isLoading ? (
              <Group justify="center" py="lg">
                <Loader size="sm" />
              </Group>
            ) : (
              <Stack gap="xs">
                {floDownBlocks.map((floDownBlock, index) => {
                  const symbolSummary = symbolSummaryMap.get(floDownBlock.id);

                  return (
                    <Group
                      key={floDownBlock.id}
                      align="stretch"
                      gap="sm"
                      wrap="nowrap"
                    >
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <ExtractedTextPanel
                          compact
                          extracts={[floDownBlock]}
                          editingId={actions.editingId}
                          selectedId={null}
                          onToggleEdit={actions.handleToggleEdit}
                          onUpdate={actions.handleUpdate}
                          onDownload={actions.handleDownload}
                          onDelete={(id) => setDeleteTarget(floDownBlocks.find((floDownBlock) => floDownBlock.id === id) ?? null)}
                          onSelection={(extractId) => {
                            semanticFlow.handleSelection("right", {
                              extractId,
                            });
                          }}
                          onOpenSemanticPanel={
                            semanticFlow.handleOpenSemanticPanel
                          }
                          onRecomputeReferences={
                            sniffyFlow.handleRecomputeReferences
                          }
                          showPageNumber={false}
                          showFloDownBlockMeta
                          showFloDownBlockMetaIconOnly
                          onEditFloDownBlockMeta={
                            actions.handleEditFloDownBlockMeta
                          }
                          isLocked={isLocked}
                          onOpenLatexPreview={actions.handleOpenLatexPreview}
                        />
                      </Box>

                      <Box w={220} py={6}>
                        <SymbolDeclaredSection
                          data={{ symbols: symbolSummary?.symbols ?? [] }}
                        />
                      </Box>

                      <Box w={56} py={6}>
                        <UploadAttributionInfo
                          attributions={[
                            {
                              label: "Extracted by",
                              user:
                                floDownBlock.createdBy ?? floDownBlock.updatedBy!,
                            },
                            {
                              label: "Last updated by",
                              user:
                                floDownBlock.updatedBy ?? floDownBlock.createdBy!,
                            },
                          ]}
                        />
                      </Box>

                      <Box w={160} py={6}>
                        {index === 0 ? (
                          <StexStatusMenu
                            status={{
                              value: status,
                              conf: statusConf,
                              discardReasonFromServer,
                            }}
                            actions={{
                              onStatusChange: actions.handleStatusChange,
                              onOpenDiscard: () => actions.setDiscardOpen(true),
                            }}
                          />
                        ) : null}
                      </Box>
                    </Group>
                  );
                })}
              </Stack>
            )}

            <StexCurationFooter
              identity={identity}
              actions={{
                onOpenMetadataForIdentity:
                  actions.handleOpenMetadataForIdentity,
                onOpenLatexPreview: actions.handleOpenLatexPreview,
                onGoToSource: () =>
                  navigate({
                    to: "/files/$documentId",
                    params: { documentId: identity.documentId },
                  }),
              }}
            />

            <LatexPreviewModal
              identity={identity}
              latex={{
                opened: actions.latexOpen,
                code: actions.latexCode,
                readOnly: latexReadOnly,
                saveDisabled: latexSaveDisabled,
                onClose: () => actions.setLatexOpen(false),
                onChangeCode: actions.setLatexCode,
                onDownload: actions.handleDownload,
                onSaveDraft: actions.handleSaveLatexDraft,
                onSaveFinal: actions.handleSaveLatexFinal,
              }}
            />

            <DiscardFloDownBlockModal
              discard={{
                opened: actions.discardOpen,
                reason: actions.discardReason,
                onClose: () => actions.setDiscardOpen(false),
                onChangeReason: actions.setDiscardReason,
                onConfirm: actions.handleConfirmDiscard,
              }}
            />

            <FloDownBlockDeleteModal
              opened={!!deleteTarget}
              floDownBlock={deleteTarget}
              onCancel={() => setDeleteTarget(null)}
              onConfirm={async () => {
                if (!deleteTarget) return;
                await actions.handleDelete(deleteTarget.id);
                await queryClient.invalidateQueries({ queryKey: ["floDownBlocks"] });
                setDeleteTarget(null);
              }}
            />
            <DuplicateFloDownBlockModal
              opened={semanticFlow.duplicateFloDownBlocks.length > 0}
              floDownBlocks={semanticFlow.duplicateFloDownBlocks}
              onCancel={() => semanticFlow.setDuplicateFloDownBlocks([])}
              onConfirm={semanticFlow.confirmDuplicateCreation}
            />

            <StexCurationDialogs
              identity={identity}
              metadata={{
                opened: actions.floDownBlockMetaEditOpen,
                floDownBlock: actions.floDownBlockMetaTarget,
                onClose: actions.handleCloseFloDownBlockMeta,
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
              selection={{
                popup: semanticFlow.popup,
                onClose: semanticFlow.clearPopupOnly,
                onDefiniendum: semanticFlow.handleOpenDefiniendumDialog,
                onSymbolicRef: semanticFlow.handleOpenSymbolicRefDialog,
                allowDefiniendum:
                  semanticFlow.canOpenDefiniendumFromSelection,
              }}
              semantic={{
                opened: semanticFlow.semanticPanelOpen,
                onClose: semanticFlow.handleCloseSemanticPanel,
                floDownBlock: semanticFlow.selectedFloDownBlock,
                onReplaceNode: semanticFlow.handleReplaceNode,
                onDeleteNode: semanticFlow.handleDeleteNode,
              }}
              definiendum={{
                opened: semanticFlow.defDialogOpen,
                extractedText: semanticFlow.floDownBlockExtractText,
                onSubmit: semanticFlow.handleDefiniendumSubmit,
                onClose: () => semanticFlow.setDefDialogOpen(false),
              }}
              symbolicRef={{
                mode: semanticFlow.mode,
                conceptUri: semanticFlow.conceptUri,
                hidden:
                  semanticFlow.extractDialogOpen ||
                  !!semanticFlow.createdSymbolTarget,
                onClose: () => semanticFlow.setMode(null),
                onSelect: semanticFlow.handleSaveSymbolicRef,
                onCreateSymbol: semanticFlow.handleCreateSymbolTargetFloDownBlock,
              }}
              extraction={{
                opened: semanticFlow.extractDialogOpen,
                initialText: semanticFlow.pendingExtractText,
                paragraphFileName: semanticFlow.paragraphFileName,
                blockType: semanticFlow.extractBlockType,
                symbolName: semanticFlow.symbolName,
                setParagraphFileName: semanticFlow.setParagraphFileName,
                setBlockType: semanticFlow.setExtractBlockType,
                setSymbolName: semanticFlow.setSymbolName,
                identity: {
                  futureRepo: identity.futureRepo,
                  filePath: identity.filePath,
                  language: identity.language,
                },
                createSymbolFlow: true,
                onClose: () => {
                  semanticFlow.setExtractDialogOpen(false);
                  semanticFlow.setMode(null);
                },
                onSubmit: semanticFlow.handleExtractSubmit,
              }}
              createdSymbolDefiniendum={{
                opened: !!semanticFlow.createdSymbolTarget,
                target: semanticFlow.createdSymbolTarget,
                onClose: () => semanticFlow.setCreatedSymbolTarget(null),
                onConfirm: semanticFlow.handleDeclareCreatedSymbolDefiniendum,
              }}
            />
          </Box>
        </Table.Td>
      </Table.Tr>
    </>
  );
}
