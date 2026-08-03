import {
  OnDeleteNode,
  OnReplaceNode,
  FloDownBlockSemantic,
} from "@/types/Semantic.types";
import { Box, Center, Flex, Modal, Text } from "@mantine/core";
import { MathhubtoSymbolPropagationDialog } from "../MathhubtoSymbolPropagationDialog";
import { SymbolPropagationDialog } from "../SymbolPropagationDialog";
import { DefiniendumEditor } from "./DefiniendumEditor";
import { SemanticNodeList } from "./SemanticNodeList";
import { SemanticPanelFooter } from "./SemanticPanelFooter";
import { SymrefEditor } from "./SymrefEditor";
import { useSemanticPanelState } from "@/hooks/semantic-panel/useSemanticPanelState";
import { blockTypeLabel, getTopLevelBlockType } from "@/types/blockType";

type Props = {
  opened: boolean;
  onClose: () => void;
  floDownBlock: FloDownBlockSemantic | null;
  onReplaceNode: OnReplaceNode;
  onDeleteNode: OnDeleteNode;
};

export function SemanticPanel({
  opened,
  onClose,
  floDownBlock,
  onReplaceNode,
  onDeleteNode,
}: Props) {
  const state = useSemanticPanelState(floDownBlock);
  const blockTypeLabelText = floDownBlock
    ? blockTypeLabel(getTopLevelBlockType(floDownBlock.statement))
    : "";
  const {
    selectedNode,
    canEditDefinienda,
    pendingPropagation,
    setPendingPropagation,
    pendingMathHubToLocal,
    setPendingMathHubToLocal,
    reset,
  } = state;

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title="Manage Semantics"
        size="80%"
        padding="md"
        centered
        overlayProps={{ opacity: 0.55, blur: 3 }}
      >
        {!floDownBlock ? (
          <Center h={300}>
            <Text c="dimmed">No definition selected</Text>
          </Center>
        ) : (
          <Flex h="70vh" style={{ overflow: "hidden" }}>
            <SemanticNodeList
              state={{ ...state, statement: floDownBlock.statement }}
            />

            <Box
              flex={1}
              pl="md"
              style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
            >
              <Box style={{ flex: 1, overflowY: "auto" }}>
                {!selectedNode && (
                  <Center h="100%">
                    <Text c="dimmed">
                      {canEditDefinienda
                        ? "Select Definienda/Symbolic Ref"
                        : `This ${blockTypeLabelText} only supports symbolic references.`}
                    </Text>
                  </Center>
                )}

                {canEditDefinienda && selectedNode?.type === "definiendum" && (
                  <DefiniendumEditor
                    floDownBlock={floDownBlock}
                    state={state}
                    onReplaceNode={onReplaceNode}
                    onDeleteNode={onDeleteNode}
                  />
                )}

                {selectedNode?.type === "symref" && (
                  <SymrefEditor
                    floDownBlock={floDownBlock}
                    state={state}
                    onReplaceNode={onReplaceNode}
                    onDeleteNode={onDeleteNode}
                  />
                )}
              </Box>

              <SemanticPanelFooter onClose={handleClose} />
            </Box>
          </Flex>
        )}
      </Modal>

      {pendingPropagation && (
        <SymbolPropagationDialog
          opened={pendingPropagation !== null}
          localSymbolUri={pendingPropagation.localSymbolUri}
          mathHubUri={pendingPropagation.mathHubUri}
          primaryFloDownBlockId={pendingPropagation.primaryFloDownBlockId}
          onReplaceNode={onReplaceNode}
          onDone={() => {
            setPendingPropagation(null);
          }}
          onSkip={() => setPendingPropagation(null)}
        />
      )}

      {pendingMathHubToLocal && (
        <MathhubtoSymbolPropagationDialog
          opened={pendingMathHubToLocal !== null}
          mathHubUri={pendingMathHubToLocal.mathHubUri}
          localSymbolUri={pendingMathHubToLocal.localSymbolUri}
          targetType={pendingMathHubToLocal.targetType}
          primaryFloDownBlockId={pendingMathHubToLocal.primaryFloDownBlockId}
          onReplaceNode={onReplaceNode}
          onDone={() => setPendingMathHubToLocal(null)}
          onCancel={() => setPendingMathHubToLocal(null)}
        />
      )}
    </>
  );
}
