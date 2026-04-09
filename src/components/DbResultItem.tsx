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
import { Box, Loader, Paper, Text } from "@mantine/core";
import React from "react";
import { FtmlPreview } from "./FtmlPreview";

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
  const { r } = props;
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

  return (
    <Paper
      withBorder
      p="xs"
      bg={isHighlighted ? "blue.0" : undefined}
      onClick={handlePaperClick}
    >
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
