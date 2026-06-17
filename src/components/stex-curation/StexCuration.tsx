import { FileIdentity } from "@/serverFns/latex.server";
import { Box, Table } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { DefinitionsSection } from "./DefinitionsSection";
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
    actualSymbols,
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

  return (
    <>
      <Table.Tr>
        <Table.Td>
          <Box maw={820}>
            <DefinitionsSection
              data={{ definitions, isLoading }}
              state={{
                editingId: actions.editingId,
                isLocked:
                  status === "SUBMITTED_TO_MATHHUB" || status === "DISCARDED",
              }}
              actions={{
                onToggleEdit: actions.handleToggleEdit,
                onUpdate: actions.handleUpdate,
                onDownload: actions.handleDownload,
                onDelete: actions.handleDelete,
                onSelection: (extractId) => {
                  semanticFlow.handleSelection("right", { extractId });
                },
                onOpenSemanticPanel: semanticFlow.handleOpenSemanticPanel,
                onRecomputeReferences: sniffyFlow.handleRecomputeReferences,
                onEditDefinitionMeta: actions.handleEditDefinitionMeta,
                onOpenLatexPreview: actions.handleOpenLatexPreview,
              }}
            />

            <StexCurationFooter
              identity={identity}
              actions={{
                onOpenMetadataForIdentity: actions.handleOpenMetadataForIdentity,
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
                onClose: () => semanticFlow.setMode(null),
                onSelect: semanticFlow.handleSaveSymbolicRef,
              }}
            />
          </Box>
        </Table.Td>

        <Table.Td>
          <SymbolDeclaredSection data={{ actualSymbols }} />
        </Table.Td>

        <Table.Td>
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
        </Table.Td>
      </Table.Tr>
    </>
  );
}
