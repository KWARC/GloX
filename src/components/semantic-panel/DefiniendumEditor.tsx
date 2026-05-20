import {
  OnDeleteNode,
  OnReplaceNode,
  SemanticDefinition,
} from "@/types/Semantic.types";
import { Button, Group, Paper, Stack, Text } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import { CurrentUriDisplay } from "../CurrentUriDisplay";
import { SearchBar } from "../SearchBar";
import { SemanticSearchResults } from "./SemanticSearchResults";
import { SemanticPanelState } from "./useSemanticPanelState";

export type DefiniendumEditorProps = {
  definition: SemanticDefinition;
  state: SemanticPanelState;
  onReplaceNode: OnReplaceNode;
  onDeleteNode: OnDeleteNode;
};

export function DefiniendumEditor({
  definition,
  state,
  onReplaceNode,
  onDeleteNode,
}: DefiniendumEditorProps) {
  const {
    selectedUri,
    setSelectedUri,
    searchInput,
    setSearchInput,
    setSearchQuery,
    editingNodeUri,
    setEditingNodeUri,
    renameValue,
    setRenameValue,
    savingRename,
    setSavingRename,
    selectedDefiniendum,
    canMakeNewSymbol,
    setSelectedNode,
  } = state;

  if (selectedDefiniendum === undefined) return null;

  async function handleReplaceNode(...args: Parameters<OnReplaceNode>) {
    return onReplaceNode(...args);
  }

  return (
    <Stack>
      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSearch={() => setSearchQuery(searchInput)}
      />

      <Group gap={4} wrap="nowrap">
        <Text
          size="xs"
          c={selectedDefiniendum.symdecl ? "blue" : "dimmed"}
          fw={600}
        >
          {selectedDefiniendum.symdecl
            ? "NEW URI currently in use :"
            : "URI currently in use :"}
        </Text>

        <CurrentUriDisplay uri={selectedDefiniendum.uri} />
      </Group>

      <Paper withBorder p="sm">
        <Group justify="space-between">
          {editingNodeUri === selectedDefiniendum.uri ? (
            <>
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                style={{ fontSize: 12, flex: 1 }}
              />

              <Button
                size="xs"
                variant="subtle"
                loading={savingRename}
                onClick={async () => {
                  setSavingRename(true);

                  await onReplaceNode(
                    definition.id,
                    {
                      type: "definiendum",
                      uri: selectedDefiniendum.uri,
                    },
                    {
                      type: "definiendum",
                      uri: selectedDefiniendum.uri,
                      content: [renameValue],
                      symdecl: selectedDefiniendum.symdecl,
                    },
                  );

                  setSavingRename(false);
                  setEditingNodeUri(null);
                }}
              >
                ✓
              </Button>
            </>
          ) : (
            <>
              <Text size="sm" style={{ flex: 1 }}>
                {selectedDefiniendum.text}
              </Text>

              <Button
                size="xs"
                variant="subtle"
                onClick={() => {
                  setEditingNodeUri(selectedDefiniendum.uri);
                  setRenameValue(selectedDefiniendum.text);
                }}
              >
                <IconPencil size={14} />
              </Button>
            </>
          )}

          <Group gap={6}>
            <Button
              size="xs"
              style={{ flexShrink: 0 }}
              disabled={!canMakeNewSymbol}
              onClick={async () => {
                const newUri = selectedUri;
                await handleReplaceNode(
                  definition.id,
                  {
                    type: "definiendum",
                    uri: selectedDefiniendum.uri,
                  },
                  {
                    type: "definiendum",
                    uri: newUri,
                    symdecl: true,
                  },
                );
                setSelectedNode({
                  type: "definiendum",
                  uri: newUri,
                });
                setSelectedUri("");
              }}
            >
              Make new symbol
            </Button>

            <Button
              size="xs"
              color="red"
              onClick={() =>
                onDeleteNode(definition.id, {
                  type: "definiendum",
                  uri: selectedDefiniendum.uri,
                })
              }
            >
              Delete
            </Button>
          </Group>
        </Group>
      </Paper>

      <SemanticSearchResults
        mode="definiendum"
        definition={definition}
        state={state}
        selected={selectedDefiniendum}
        onReplaceNode={onReplaceNode}
      />
    </Stack>
  );
}
