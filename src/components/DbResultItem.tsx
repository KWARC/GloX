import { useDefinitionBySymbol } from "@/serverFns/definitionbysymbol.server";
import { assertFtmlStatement } from "@/types/ftml.types";
import {
  DbSymbolResult,
  DefiniendumNode,
  OnReplaceNode,
  SelectedNode,
  SemanticDefinition,
  SymrefNode,
} from "@/types/Semantic.types";
import { Box, Button, Group, Loader, Paper, Text } from "@mantine/core";
import React from "react";
import { FtmlPreview } from "./FtmlPreview";
import { RenderDbSymbol } from "./RenderUri";

type BaseProps = {
  r: DbSymbolResult;
  definition: SemanticDefinition;
  onReplaceNode: OnReplaceNode;
  setSelectedNode: React.Dispatch<React.SetStateAction<SelectedNode>>;
};

type DefiniendumProps = BaseProps & {
  mode: { type: "definiendum"; selected: DefiniendumNode };
  selectedUri: string;
  setSelectedUri: (v: string) => void;
};

type SymrefProps = BaseProps & {
  mode: { type: "symref"; selected: SymrefNode };
};

export type DbResultItemProps = DefiniendumProps | SymrefProps;

export function DbResultItem(props: DbResultItemProps) {
  const { r, definition, mode, onReplaceNode, setSelectedNode } = props;
  const { data: def, isLoading } = useDefinitionBySymbol(r.symbolName);

  const isHighlighted =
    props.mode.type === "definiendum" &&
    "selectedUri" in props &&
    props.selectedUri === r.symbolName;

  function handlePaperClick() {
    if (props.mode.type === "definiendum" && "setSelectedUri" in props) {
      props.setSelectedUri(r.symbolName);
    }
  }

  function handleUseThis(e: React.MouseEvent) {
    const newUri = r.symbolName;
    if (mode.type === "definiendum") {
      e.stopPropagation();
      onReplaceNode(
        definition.id,
        { type: "definiendum", uri: mode.selected.uri },
        { type: "definiendum", uri: newUri, symdecl: false },
      );
      setSelectedNode({ type: "definiendum", uri: newUri });
      if (props.mode.type === "definiendum" && "setSelectedUri" in props) {
        props.setSelectedUri(newUri);
      }
    } else {
      onReplaceNode(
        definition.id,
        { type: "symref", uri: mode.selected.uri },
        { type: "symref", uri: newUri },
      );
      setSelectedNode({ type: "symref", uri: newUri });
    }
  }

  return (
    <Paper
      withBorder
      p="xs"
      bg={isHighlighted ? "blue.0" : undefined}
      onClick={handlePaperClick}
    >
      <Group justify="space-between" wrap="nowrap" align="center">
        <RenderDbSymbol
          symbol={{
            symbolName: r.symbolName,
            source: "DB",
            futureRepo: r.futureRepo,
          }}
        />

        <Button size="xs" style={{ flexShrink: 0 }} onClick={handleUseThis}>
          Use this
        </Button>
      </Group>

      {isLoading && <Loader size="xs" mt="xs" />}

      {!isLoading && def === null && (
        <Box mt="xs">
          <Text size="xs" c="dimmed">
            No definition has been created
          </Text>
        </Box>
      )}

      {def && (
        <Box mt="xs" h={120}>
          <FtmlPreview
            ftmlAst={assertFtmlStatement(def.statement)}
            docId={def.id}
          />
        </Box>
      )}
    </Paper>
  );
}
