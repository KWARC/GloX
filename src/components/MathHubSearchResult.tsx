import { SemanticDefinition } from "@/types/Semantic.types";
import { Box, Button, Group, Paper } from "@mantine/core";
import { RenderSymbolicUri } from "./RenderUri";
import { SymbolicLinkPreview } from "./SymbolicLinkPreview";

export type PendingPropagation = {
  localSymbolUri: string;
  mathHubUri: string;
  primaryDefinitionId: string;
};

type MathHubSearchResultProps = {
  safeUri: string;
  definition: SemanticDefinition;
  selectedDefiniendum: { uri: string } | null;
  setPendingPropagation: (data: PendingPropagation) => void;
};

export function MathHubSearchResult({
  safeUri,
  definition,
  selectedDefiniendum,
  setPendingPropagation,
}: MathHubSearchResultProps) {
  return (
    <Paper p="xs" withBorder>
      <Group justify="space-between">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Box>
            <RenderSymbolicUri uri={safeUri} showRightLabel={false} />
            <SymbolicLinkPreview uri={safeUri} />
          </Box>
        </Box>
        <Button
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            if (!selectedDefiniendum) return;
            setPendingPropagation({
              localSymbolUri: selectedDefiniendum.uri,
              mathHubUri: safeUri,
              primaryDefinitionId: definition.id,
            });
          }}
        >
          Use this
        </Button>
      </Group>
    </Paper>
  );
}
