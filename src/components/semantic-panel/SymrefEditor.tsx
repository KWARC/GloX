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

export type SymrefEditorProps = {
  definition: SemanticDefinition;
  state: SemanticPanelState;
  onReplaceNode: OnReplaceNode;
  onDeleteNode: OnDeleteNode;
};

export function SymrefEditor({
  definition,
  state,
  onReplaceNode,
  onDeleteNode,
}: SymrefEditorProps) {
  const {
    searchInput,
    setSearchInput,
    setSearchQuery,
    editingNodeUri,
    setEditingNodeUri,
    renameValue,
    setRenameValue,
    savingRename,
    setSavingRename,
    selectedSymref,
  } = state;

  if (selectedSymref === undefined) return null;

  return (
    <Stack>
      <SearchBar
        value={searchInput}
        onChange={setSearchInput}
        onSearch={() => setSearchQuery(searchInput)}
      />

      <Group gap={6} wrap="nowrap">
        <Text size="sm">Current URI:</Text>
        <CurrentUriDisplay uri={selectedSymref.uri} />
      </Group>

      <Paper withBorder p="sm">
        <Group justify="space-between">
          {editingNodeUri === selectedSymref.uri ? (
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
                      type: "symref",
                      uri: selectedSymref.uri,
                    },
                    {
                      type: "symref",
                      uri: selectedSymref.uri,
                      content: [renameValue],
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
                {selectedSymref.text}
              </Text>

              <Button
                size="xs"
                variant="subtle"
                onClick={() => {
                  setEditingNodeUri(selectedSymref.uri);
                  setRenameValue(selectedSymref.text);
                }}
              >
                <IconPencil size={14} />
              </Button>
            </>
          )}

          <Group gap={6}>
            <Button
              size="xs"
              color="red"
              onClick={() =>
                onDeleteNode(definition.id, {
                  type: "symref",
                  uri: selectedSymref.uri,
                })
              }
            >
              Delete
            </Button>
          </Group>
        </Group>
      </Paper>

      <SemanticSearchResults
        mode="symref"
        definition={definition}
        state={state}
        selected={selectedSymref}
        onReplaceNode={onReplaceNode}
      />
    </Stack>
  );
}
