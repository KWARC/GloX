import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { parseUri } from "@/server/parseUri";
import { SymbolSearchResult } from "@/server/useSymbolSearch";
import {
  ActionIcon,
  Button,
  Group,
  Paper,
  Portal,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { SymbolResult } from "./SymbolResult";

const SEARCH_MODAL_WIDTH = 440;
const SEARCH_MODAL_RIGHT_OFFSET = 60;
const SEARCH_MODAL_TOP_OFFSET = 80;

interface SymbolicRefProps {
  conceptUri: string;
  onSelect: (symRef: UnifiedSymbolicReference) => void;
  onClose: () => void;
}

export function SymbolicRef({
  conceptUri,
  onSelect,
  onClose,
}: SymbolicRefProps) {
  const [searchQuery, setSearchQuery] = useState(() => conceptUri);
  const [selectedSymbol, setSelectedSymbol] =
    useState<SymbolSearchResult | null>(null);

  const handleSymbolSelect = () => {
    if (!selectedSymbol) return;

    if (selectedSymbol.source === "DB") {
      onSelect({
        source: "DB",
        symbolName: selectedSymbol.symbolName,
        futureRepo: selectedSymbol.futureRepo,
        filePath: selectedSymbol.filePath,
        fileName: selectedSymbol.fileName,
        language: selectedSymbol.language,
      });
    } else {
      onSelect({
        source: "MATHHUB",
        uri: selectedSymbol.uri,
      });
    }
  };

  useEffect(() => {
    const stop = (e: Event) => e.stopPropagation();

    window.addEventListener("wheel", stop, true);
    window.addEventListener("mousedown", stop, true);
    window.addEventListener("mouseup", stop, true);

    return () => {
      window.removeEventListener("wheel", stop, true);
      window.removeEventListener("mousedown", stop, true);
      window.removeEventListener("mouseup", stop, true);
    };
  }, []);

  return (
    <Portal>
      <Paper
        withBorder
        shadow="xl"
        p="lg"
        radius="md"
        style={{
          position: "fixed",
          right: SEARCH_MODAL_RIGHT_OFFSET,
          top: SEARCH_MODAL_TOP_OFFSET,
          width: SEARCH_MODAL_WIDTH,
          maxHeight: "calc(100vh - 120px)",
          overflowY: "auto",
          zIndex: 4000,
          border: "2px solid var(--mantine-color-blue-4)",
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <Text fw={600}>Symbolic Reference</Text>
            </Group>
            <ActionIcon variant="subtle" color="gray" onClick={onClose}>
              <IconX size={16} />
            </ActionIcon>
          </Group>

          <Paper withBorder p="sm" bg="blue.0" radius="md">
            <Text size="xs" fw={600} c="dimmed" mb={4}>
              Selected Text:
            </Text>
            <Text size="sm" fw={500}>
              {conceptUri}
            </Text>
          </Paper>

          <SymbolResult
            initialQuery={searchQuery}
            onQueryChange={setSearchQuery}
            selectedSymbol={selectedSymbol}
            onSelectSymbol={setSelectedSymbol}
          />

          {selectedSymbol?.source === "MATHHUB" && (
            <Paper withBorder p="sm" bg="green.0" radius="md">
              <Text size="xs" fw={600} c="dimmed" mb={4}>
                Selected Symbol:
              </Text>
              <Tooltip
                label={selectedSymbol.uri}
                withArrow
                multiline
                maw={400}
                position="top"
                zIndex={5000}
              >
                <span style={{ cursor: "help", display: "inline-block" }}>
                  <Text size="xs" ff="monospace" component="span">
                    {parseUri(selectedSymbol.uri).symbol}
                  </Text>
                </span>
              </Tooltip>
            </Paper>
          )}

          {selectedSymbol?.source === "DB" && (
            <Paper withBorder p="sm" bg="green.0" radius="md">
              <Text size="xs" fw={600} c="dimmed" mb={4}>
                Selected Symbol (Database):
              </Text>
              <Text size="xs" ff="monospace">
                {selectedSymbol.symbolName}
              </Text>
            </Paper>
          )}

          <Button
            onClick={handleSymbolSelect}
            disabled={!selectedSymbol}
            fullWidth
          >
            Select Symbol
          </Button>
        </Stack>
      </Paper>
    </Portal>
  );
}
