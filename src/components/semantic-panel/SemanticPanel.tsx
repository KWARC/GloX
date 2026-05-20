import {
  OnDeleteNode,
  OnReplaceNode,
  SemanticDefinition,
} from "@/types/Semantic.types";
import { Box, Center, Flex, Modal, Text } from "@mantine/core";
import { MathhubtoSymbolPropagationDialog } from "../MathhubtoSymbolPropagationDialog";
import { SymbolPropagationDialog } from "../SymbolPropagationDialog";
import { DefiniendumEditor } from "./DefiniendumEditor";
import { SemanticNodeList } from "./SemanticNodeList";
import { SemanticPanelFooter } from "./SemanticPanelFooter";
import { SymrefEditor } from "./SymrefEditor";
import { useSemanticPanelState } from "./useSemanticPanelState";

type Props = {
  opened: boolean;
  onClose: () => void;
  definition: SemanticDefinition | null;
  onReplaceNode: OnReplaceNode;
  onDeleteNode: OnDeleteNode;
};

export function SemanticPanel({
  opened,
  onClose,
  definition,
  onReplaceNode,
  onDeleteNode,
}: Props) {
  const state = useSemanticPanelState(definition);
  const {
    selectedNode,
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
        {!definition ? (
          <Center h={300}>
            <Text c="dimmed">No definition selected</Text>
          </Center>
        ) : (
          <Flex h="70vh" style={{ overflow: "hidden" }}>
            <SemanticNodeList state={state} />

            <Box
              flex={1}
              pl="md"
              style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
            >
              <Box style={{ flex: 1, overflowY: "auto" }}>
                {!selectedNode && (
                  <Center h="100%">
                    <Text c="dimmed">Select Definienda/Symbolic Ref</Text>
                  </Center>
                )}

                {selectedNode?.type === "definiendum" && (
                  <DefiniendumEditor
                    definition={definition}
                    state={state}
                    onReplaceNode={onReplaceNode}
                    onDeleteNode={onDeleteNode}
                  />
                )}

                {selectedNode?.type === "symref" && (
                  <SymrefEditor
                    definition={definition}
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
          primaryDefinitionId={pendingPropagation.primaryDefinitionId}
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
          primaryDefinitionId={pendingMathHubToLocal.primaryDefinitionId}
          onReplaceNode={onReplaceNode}
          onDone={() => setPendingMathHubToLocal(null)}
          onCancel={() => setPendingMathHubToLocal(null)}
        />
      )}
    </>
  );
}
