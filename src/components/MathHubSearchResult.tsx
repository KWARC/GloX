import { SemanticDefinition } from "@/types/Semantic.types";
import { Box, Button, Group, Paper, Popover } from "@mantine/core";
import { useState } from "react";
import { RenderSymbolicUri } from "./RenderUri";

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
  const [opened, setOpened] = useState(false);

  return (
    <Popover opened={opened} position="right" withArrow width={350}>
      <Popover.Target>
        <Paper
          p="xs"
          withBorder
          style={{ cursor: "pointer" }}
          onMouseEnter={() => setOpened(true)}
          onMouseLeave={() => setOpened(false)}
        >
          <Group justify="space-between">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <RenderSymbolicUri uri={safeUri} />
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
      </Popover.Target>

      <Popover.Dropdown
        onMouseEnter={() => setOpened(true)}
        onMouseLeave={() => setOpened(false)}
      >
        <Box h={150}>
          <iframe
            src={safeUri.replace("http:", "https:")}
            sandbox="allow-scripts allow-same-origin"
            title="MathHub content preview"
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
