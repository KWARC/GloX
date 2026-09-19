import { FloDownBlockSemantic } from "@/types/Semantic.types";
import { Box, Button, Group, Paper } from "@mantine/core";
import { RenderSymbolicUri } from "./RenderUri";
import { SymbolicLinkPreview } from "./SymbolicLinkPreview";

export type PendingMathHubDuplicate = {
  localSymbolUri: string;
  mathHubUri: string;
  primaryFloDownBlockId: string;
};

type MathHubSearchResultProps = {
  safeUri: string;
  floDownBlock: FloDownBlockSemantic;
  localSymbolUri: string;
  setPendingMathHubDuplicate: (data: PendingMathHubDuplicate) => void;
};

export function MathHubSearchResult({
  safeUri,
  floDownBlock,
  localSymbolUri,
  setPendingMathHubDuplicate,
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
            setPendingMathHubDuplicate({
              localSymbolUri,
              mathHubUri: safeUri,
              primaryFloDownBlockId: floDownBlock.id,
            });
          }}
        >
          Same as this
        </Button>
      </Group>
    </Paper>
  );
}
