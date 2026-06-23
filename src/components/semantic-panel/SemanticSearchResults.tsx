import { normalizeSymRef } from "@/server/parseUri";
import {
  DefiniendumNode,
  OnReplaceNode,
  SemanticDefinition,
  SymrefNode,
} from "@/types/Semantic.types";
import { normalizeMathHubPreviewUrl } from "@/lib/mathhub";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { DbResultItem } from "../DbResultItem";
import { RenderDbSymbol, RenderSymbolicUri } from "../RenderUri";
import { ResultsSection } from "../ResultsSection";
import { SymbolicLinkPreview } from "../SymbolicLinkPreview";
import {
  PendingMathHubToLocal,
  PendingPropagation,
  SemanticPanelState,
} from "./useSemanticPanelState";

type BaseProps = {
  definition: SemanticDefinition;
  state: SemanticPanelState;
  onReplaceNode: OnReplaceNode;
};

type DefiniendumProps = BaseProps & {
  mode: "definiendum";
  selected: DefiniendumNode;
};

type SymrefProps = BaseProps & {
  mode: "symref";
  selected: SymrefNode;
};

export type SemanticSearchResultsProps = DefiniendumProps | SymrefProps;

export function SemanticSearchResults(props: SemanticSearchResultsProps) {
  const { definition, state, onReplaceNode } = props;
  const {
    selectedUri,
    setSelectedUri,
    dbResults,
    mathhubResults,
    searchLoading,
    hasSearched,
    setSelectedNode,
    setPendingPropagation,
    setPendingMathHubToLocal,
  } = state;

  async function handleReplaceNode(...args: Parameters<OnReplaceNode>) {
    return onReplaceNode(...args);
  }

  return (
    <ResultsSection isLoading={searchLoading}>
      <>
        {hasSearched && dbResults.length === 0 && (
          <Text size="xs" c="dimmed">
            No results found in Local DB
          </Text>
        )}

        {dbResults.length > 0 && (
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed">
              Local DB
            </Text>

            {dbResults.map((r) => {
              const bg =
                props.mode === "definiendum" && selectedUri === r.symbolName
                  ? "blue.0"
                  : undefined;

              return (
                <Paper
                  key={r.id}
                  withBorder
                  p="xs"
                  style={{ cursor: "pointer" }}
                  bg={bg}
                  onClick={() => {
                    if (props.mode === "definiendum") {
                      setSelectedUri(r.symbolName);
                    }
                  }}
                >
                  <Stack gap={6}>
                    <Group justify="space-between" wrap="nowrap">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <RenderDbSymbol
                          symbol={{
                            symbolName: r.symbolName,
                            source: "DB",
                            futureRepo: r.futureRepo,
                          }}
                        />
                      </Box>

                      <Button
                        size="xs"
                        style={{ width: 80 }}
                        onClick={(e) => {
                          e.stopPropagation();

                          if (props.mode === "definiendum") {
                            if (props.selected.uri.startsWith("http")) {
                              setPendingMathHubToLocal({
                                mathHubUri: props.selected.uri,
                                localSymbolUri: r.symbolName,
                                targetType: "definiendum",
                                primaryDefinitionId: definition.id,
                              } satisfies PendingMathHubToLocal);
                            } else {
                              setPendingPropagation({
                                localSymbolUri: props.selected.uri,
                                mathHubUri: r.symbolName,
                                primaryDefinitionId: definition.id,
                              } satisfies PendingPropagation);
                            }

                            setSelectedNode({
                              type: "definiendum",
                              uri: r.symbolName,
                            });
                            setSelectedUri(r.symbolName);
                            return;
                          }

                          const newUri = r.symbolName;

                          if (props.selected.uri.startsWith("http")) {
                            setPendingMathHubToLocal({
                              mathHubUri: props.selected.uri,
                              localSymbolUri: newUri,
                              targetType: "symref",
                              primaryDefinitionId: definition.id,
                            } satisfies PendingMathHubToLocal);
                          } else {
                            const { uri, text } = normalizeSymRef({
                              source: "DB",
                              symbolName: r.symbolName,
                              futureRepo: r.futureRepo,
                              filePath: r.filePath,
                              fileName: r.fileName,
                              language: r.language,
                            });
                            onReplaceNode(
                              definition.id,
                              {
                                type: "symref",
                                uri: props.selected.uri,
                              },
                              {
                                type: "symref",
                                uri,
                                content: [text],
                              },
                            );
                          }

                          setSelectedNode({
                            type: "symref",
                            uri: newUri,
                          });
                        }}
                      >
                        Use this
                      </Button>
                    </Group>

                    {props.mode === "definiendum" ? (
                      <DbResultItem
                        r={r}
                        definition={definition}
                        mode={{
                          type: "definiendum",
                          selected: props.selected,
                        }}
                        selectedUri={selectedUri}
                        setSelectedUri={setSelectedUri}
                        onReplaceNode={handleReplaceNode}
                        setSelectedNode={setSelectedNode}
                      />
                    ) : (
                      <DbResultItem
                        r={r}
                        definition={definition}
                        mode={{
                          type: "symref",
                          selected: props.selected,
                        }}
                        onReplaceNode={handleReplaceNode}
                        setSelectedNode={setSelectedNode}
                      />
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}

        {hasSearched && mathhubResults.length === 0 && (
          <Text size="xs" c="dimmed" mt="sm">
            No results found in MathHub
          </Text>
        )}

        {mathhubResults.length > 0 && (
          <Stack gap="xs" mt="sm">
            <Text size="xs" fw={600} c="dimmed">
              MathHub
            </Text>

            {mathhubResults.map((r) => {
              const bg =
                props.mode === "definiendum" && selectedUri === r.uri
                  ? "blue.0"
                  : undefined;
              const iframeSrc = normalizeMathHubPreviewUrl(r.uri);

              return (
                <Paper
                  key={r.uri}
                  withBorder
                  p="xs"
                  style={props.mode === "definiendum" ? { cursor: "pointer" } : undefined}
                  bg={bg}
                  onClick={() => {
                    if (props.mode === "definiendum") setSelectedUri(r.uri);
                  }}
                >
                  <Group justify="space-between" wrap="nowrap">
                    {props.mode === "definiendum" ? (
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Stack gap={2}>
                          <RenderSymbolicUri
                            uri={r.uri}
                            showRightLabel={false}
                          />
                          <SymbolicLinkPreview uri={r.uri} />
                        </Stack>
                      </Box>
                    ) : (
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Stack gap={2}>
                          <RenderSymbolicUri
                            uri={r.uri}
                            showRightLabel={false}
                          />
                          <SymbolicLinkPreview uri={r.uri} />
                        </Stack>
                      </Box>
                    )}

                    <Button
                      size="xs"
                      onClick={async (e) => {
                        e.stopPropagation();

                        if (props.mode === "definiendum") {
                          setPendingPropagation({
                            localSymbolUri: props.selected.uri,
                            mathHubUri: r.uri,
                            primaryDefinitionId: definition.id,
                          } satisfies PendingPropagation);

                          setSelectedNode({
                            type: "definiendum",
                            uri: r.uri,
                          });
                          setSelectedUri(r.uri);
                          return;
                        }

                        const { uri, text } = normalizeSymRef({
                          source: "MATHHUB",
                          uri: r.uri,
                        });

                        await handleReplaceNode(
                          definition.id,
                          {
                            type: "symref",
                            uri: props.selected.uri,
                          },
                          { type: "symref", uri, content: [text] },
                        );

                        setSelectedNode({
                          type: "symref",
                          uri,
                        });
                      }}
                    >
                      Use this
                    </Button>
                  </Group>

                  <Box mt="xs" h={140}>
                    <iframe
                      src={iframeSrc}
                      style={{
                        width: "100%",
                        height: "100%",
                        border: "none",
                      }}
                    />
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </>
    </ResultsSection>
  );
}
