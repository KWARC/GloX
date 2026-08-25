import { createDeclarationRecord } from "@/server/declaredSymbolsInfo";
import { useFloDownBlockBySymbol } from "@/serverFns/floDownBlockBySymbol.server";
import { assertFloDownStatement } from "@/types/floDown.types";
import {
  DbSymbolResult,
  DefiniendumNode,
  OnReplaceNode,
  SelectedNode,
  FloDownBlockSemantic,
  SymrefNode,
} from "@/types/Semantic.types";
import { Box, Loader, Paper, Text } from "@mantine/core";
import React from "react";
import { FtmlPreview } from "./FtmlPreview";

type BaseProps = {
  r: DbSymbolResult;
  floDownBlock: FloDownBlockSemantic;
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
  const { data: def, isLoading } = useFloDownBlockBySymbol(r.symbolName);

  const isHighlighted =
    props.mode.type === "definiendum" &&
    "selectedUri" in props &&
    props.selectedUri === r.symbolUri;

  function handlePaperClick() {
    if (props.mode.type === "definiendum" && "setSelectedUri" in props) {
      props.setSelectedUri(r.symbolUri);
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
            ftmlAst={assertFloDownStatement(def.statement)}
            docId={def.id}
            declaredSymbols={[r.symbolUri]}
            declaredSymbolsInfo={[
              createDeclarationRecord({
                symbolName: r.symbolName,
                symbolUri: r.symbolUri,
              }),
            ]}
          />
        </Box>
      )}
    </Paper>
  );
}
