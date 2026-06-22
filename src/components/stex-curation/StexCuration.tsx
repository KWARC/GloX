import { ExtractedTextPanel } from "@/components/ExtractedTextList";
import { FileIdentity } from "@/serverFns/latex.server";
import { Box, Group, Loader, Stack, Table } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { DiscardDefinitionModal } from "./DiscardDefinitionModal";
import { LatexPreviewModal } from "./LatexPreviewModal";
import { StexCurationDialogs } from "./StexCurationDialogs";
import { StexCurationFooter } from "./StexCurationFooter";
import { StexStatusMenu } from "./StexStatusMenu";
import { SymbolDeclaredSection } from "./SymbolDeclaredSection";
import { useStexCurationActions } from "./useStexCurationActions";
import { useStexCurationData } from "./useStexCurationData";
import { useStexSemanticFlow } from "./useStexSemanticFlow";
import { useStexSniffyFlow } from "./useStexSniffyFlow";

export function StexCuration({ identity }: { identity: FileIdentity }) {
  const navigate = useNavigate();
  const curationData = useStexCurationData(identity);
  const {
    definitions,
    isLoading,
    definitionIds,
    provenance,
    sniffyCatalog,
    definitionSymbolSummaries,
    status,
    statusConf,
    discardReasonFromServer,
  } = curationData;
  const sniffyFlow = useStexSniffyFlow(identity, definitions, sniffyCatalog);
  const semanticFlow = useStexSemanticFlow(identity, definitions);
  const actions = useStexCurationActions(identity, definitionIds, provenance);
  const latexReadOnly =
    status === "SUBMITTED_TO_MATHHUB" || status === "DISCARDED";
  const latexSaveDisabled =
    status === "FINALIZED_IN_FILE" ||
    status === "SUBMITTED_TO_MATHHUB" ||
    status === "DISCARDED";
  const isLocked = status === "SUBMITTED_TO_MATHHUB" || status === "DISCARDED";
  const symbolSummaryMap = new Map(
    definitionSymbolSummaries.map((summary) => [summary.definitionId, summary]),
  );

  return (
    <>
      <Table.Tr>
        <Table.Td colSpan={3} p={0}>
          <Box px="sm" py="xs">
            {isLoading ? (
              <Group justify="center" py="lg">
                <Loader size="sm" />
              </Group>
            ) : (
              <Stack gap="xs">
                {definitions.map((definition, index) => {
                  const symbolSummary = symbolSummaryMap.get(definition.id);

                  return (
                    <Group
                      key={definition.id}
                      align="stretch"
                      gap="sm"
                      wrap="nowrap"
                    >
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <ExtractedTextPanel
                          compact
                          extracts={[definition]}
                          editingId={actions.editingId}
                          selectedId={null}
                          onToggleEdit={actions.handleToggleEdit}
                          onUpdate={actions.handleUpdate}
                          onDownload={actions.handleDownload}
                          onDelete={actions.handleDelete}
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
                          showDefinitionMeta
                          showDefinitionMetaIconOnly
                          onEditDefinitionMeta={
                            actions.handleEditDefinitionMeta
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

            <DiscardDefinitionModal
              discard={{
                opened: actions.discardOpen,
                reason: actions.discardReason,
                onClose: () => actions.setDiscardOpen(false),
                onChangeReason: actions.setDiscardReason,
                onConfirm: actions.handleConfirmDiscard,
              }}
            />

            <StexCurationDialogs
              identity={identity}
              metadata={{
                opened: actions.definitionMetaEditOpen,
                definition: actions.definitionMetaTarget,
                onClose: actions.handleCloseDefinitionMeta,
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
                definition: semanticFlow.selectedDefinition,
                onReplaceNode: semanticFlow.handleReplaceNode,
                onDeleteNode: semanticFlow.handleDeleteNode,
              }}
              definiendum={{
                opened: semanticFlow.defDialogOpen,
                extractedText: semanticFlow.defExtractText,
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
                onCreateSymbol: semanticFlow.handleCreateSymbolTargetDefinition,
              }}
              extraction={{
                opened: semanticFlow.extractDialogOpen,
                initialText: semanticFlow.pendingExtractText,
                definitionName: semanticFlow.definitionName,
                kind: semanticFlow.extractKind,
                symbolName: semanticFlow.symbolName,
                setDefinitionName: semanticFlow.setDefinitionName,
                setKind: semanticFlow.setExtractKind,
                setSymbolName: semanticFlow.setSymbolName,
                filePath: `${identity.futureRepo}/ ${identity.filePath}`,
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
