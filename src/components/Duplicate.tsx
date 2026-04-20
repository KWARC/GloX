import { queryClient } from "@/queryClient";
import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
import { parseUri, ReplacePayload } from "@/server/parseUri";
import { ExtractedItem, useTextSelection } from "@/server/text-selection";
import { SymbolSearchResult, useSymbolSearch } from "@/server/useSymbolSearch";
import {
  deleteDefinition,
  updateDefinition,
} from "@/serverFns/extractDefinition.server";
import {
  createSymbolDefiniendum,
  getAllSymbols,
  getDefinitionBySymbol,
} from "@/serverFns/symbol.server";
import {
  confirmSymbolNotDuplicate,
  undoSymbolConfirmation,
} from "@/serverFns/symbolDuplicate.server";
import { symbolicRef } from "@/serverFns/symbolicRef.server";
import {
  updateDefinitionAst,
  UpdateDefinitionAstResult,
} from "@/serverFns/updateDefinition.server";
import { assertFtmlStatement, FtmlStatement } from "@/types/ftml.types";
import { OnReplaceNode, SemanticDefinition } from "@/types/Semantic.types";
import { Box, Button, Group, Loader, Paper, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ConfirmationModal, ConfirmDialogKind } from "./ConfirmationModal";
import { ConfirmedIcon } from "./ConfirmedIcon";
import { DefiniendumDialog } from "./DefiniendumDialog";
import { ExtractedTextPanel } from "./ExtractedTextList";
import { MathHubSearchResult, PendingPropagation } from "./MathHubSearchResult";
import { SelectionPopup } from "./SelectionPopup";
import { SemanticPanel } from "./SemanticPanel";
import { SymbolicRef } from "./SymbolicRef";
import { SymbolPropagationDialog } from "./SymbolPropagationDialog";

const handleReplaceNode: OnReplaceNode = async (
  definitionId,
  target,
  payload,
): Promise<UpdateDefinitionAstResult> => {
  const result = await updateDefinitionAst({
    data: {
      definitionId,
      operation: { kind: "replaceSemantic", target, payload },
    },
  });
  await queryClient.invalidateQueries({ queryKey: ["dedup-symbols"] });
  return result;
};

export function Duplicate({ symbolName }: { symbolName: string }) {
  const [pendingPropagation, setPendingPropagation] =
    useState<PendingPropagation | null>(null);
  const [visibleCount, setVisibleCount] = useState(2);
  const [dialogKind, setDialogKind] = useState<ConfirmDialogKind | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const { selection, popup, handleSelection, clearPopupOnly, clearAll } =
    useTextSelection();

  const [defDialogOpen, setDefDialogOpen] = useState(false);

  const [defExtractText, setDefExtractText] = useState<string | null>(null);

  const [defExtractId, setDefExtractId] = useState<string | null>(null);

  const [mode, setMode] = useState<"SymbolicRef" | null>(null);

  const [conceptUri, setConceptUri] = useState("");

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const [savedSelection, setSavedSelection] = useState<any>(null);

  const { data: rawDefinition, isLoading } = useQuery({
    queryKey: ["definition-by-symbol", symbolName],
    queryFn: () => getDefinitionBySymbol({ data: symbolName }),
  });

  const { data: symbols = [] } = useQuery({
    queryKey: ["dedup-symbols"],
    queryFn: () => getAllSymbols(),
  });

  const symbol = symbols.find((s) => s.symbolName === symbolName);

  const confirmedByName = useMemo<string | null>(() => {
    if (!symbol?.confirmedById) return null;
    const withRelation = symbol as typeof symbol & {
      confirmedBy?: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
      } | null;
    };
    if (withRelation.confirmedBy) {
      const { firstName, lastName, email } = withRelation.confirmedBy;
      if (firstName || lastName)
        return [firstName, lastName].filter(Boolean).join(" ");
      if (email) return email;
    }
    return symbol.confirmedById;
  }, [symbol]);

  const definition = useMemo<SemanticDefinition | null>(() => {
    if (!rawDefinition?.statement) return null;
    try {
      return {
        id: rawDefinition.id,
        statement: assertFtmlStatement(rawDefinition.statement),
      };
    } catch {
      return null;
    }
  }, [rawDefinition]);

  const extractedItems = useMemo<ExtractedItem[]>(() => {
    if (!rawDefinition?.statement) return [];
    return [
      {
        id: rawDefinition.id,
        pageNumber: 0,
        statement: assertFtmlStatement(rawDefinition.statement),
        futureRepo: "",
        filePath: "",
        fileName: "",
        language: "",
        symbolicRefs: [],
      },
    ];
  }, [rawDefinition]);

  const selectedDefiniendum = useMemo(() => {
    if (!definition) return null;
    const { definienda } = extractSemanticIndex(
      definition.statement,
      definition,
    );
    return (
      definienda.find((d) => d.uri === symbolName) ||
      definienda.find((d) => d.text === symbolName) ||
      definienda[0] ||
      null
    );
  }, [definition, symbolName]);

  const searchQuery = `${symbolName} definition`;
  const { results, isLoading: isSearching } = useSymbolSearch(
    searchQuery,
    true,
  );

  function handleToggleEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
  }

  async function handleUpdate(id: string, statement: FtmlStatement) {
    await updateDefinition({ data: { id, statement } });
    setEditingId(null);
    await queryClient.invalidateQueries({
      queryKey: ["definition-by-symbol", symbolName],
    });
  }

  async function handleDelete(id: string) {
    await deleteDefinition({ data: { id } });
    await queryClient.invalidateQueries({
      queryKey: ["definition-by-symbol", symbolName],
    });
  }

  async function handleReplaceNodeLocal(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
    payload: ReplacePayload,
  ): Promise<UpdateDefinitionAstResult> {
    const result = await updateDefinitionAst({
      data: {
        definitionId,
        operation: { kind: "replaceSemantic", target, payload },
      },
    });
    await queryClient.invalidateQueries({
      queryKey: ["definition-by-symbol", symbolName],
    });
    return result;
  }

  function handleDeleteNode(
    definitionId: string,
    target: { type: "definiendum" | "symref"; uri: string },
  ) {
    void updateDefinitionAst({
      data: {
        definitionId,
        operation: { kind: "removeSemantic", target },
      },
    }).then(() =>
      queryClient.invalidateQueries({
        queryKey: ["definition-by-symbol", symbolName],
      }),
    );
  }

  async function handleDefiniendumSubmit(params: any) {
    if (!defExtractId || !defExtractText || !selection) return;

    if (params.mode === "CREATE") {
      await createSymbolDefiniendum({
        data: {
          definitionId: defExtractId,
          selectedText: defExtractText,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          symdecl: true,
          futureRepo: "",
          filePath: "",
          fileName: "",
          language: "en",
          symbolName: params.symbolName,
          alias: params.alias || null,
        },
      });
    } else {
      await createSymbolDefiniendum({
        data: {
          definitionId: defExtractId,
          selectedText: defExtractText,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          symdecl: false,
          futureRepo: "",
          filePath: "",
          fileName: "",
          language: "en",
          selectedSymbolSource: params.selectedSymbol.source,
          selectedSymbolId: params.selectedSymbol.id,
          selectedSymbolUri: params.selectedSymbol.uri,
          symbolName: "",
        },
      });
    }

    await queryClient.invalidateQueries({
      queryKey: ["definition-by-symbol", symbolName],
    });

    setDefDialogOpen(false);
    setDefExtractId(null);
    setDefExtractText(null);
    clearAll();
  }

  async function handleSaveSymbolicRef(symRef: any) {
    if (!defExtractId || !selection) return;

    if (editingNodeId) {
      await updateDefinitionAst({
        data: {
          definitionId: defExtractId,
          operation: {
            kind: "replaceSemantic",
            target: { type: "symref", uri: editingNodeId },
            payload: {
              type: "symref",
              uri:
                symRef.source === "MATHHUB"
                  ? symRef.uri
                  : `${symRef.futureRepo}/${symRef.symbolName}`,
            },
          },
        },
      });
    } else {
      await symbolicRef({
        data: {
          definitionId: defExtractId,
          selection: {
            text: savedSelection.text,
            startOffset: selection.startOffset,
            endOffset: selection.endOffset,
          },
          symRef,
        },
      });
    }

    await queryClient.invalidateQueries({
      queryKey: ["definition-by-symbol", symbolName],
    });

    setMode(null);
    setEditingNodeId(null);
  }

  if (!isLoading && !definition) return null;

  const mathHubResults = results.filter(
    (r): r is Extract<SymbolSearchResult, { source: "MATHHUB" }> =>
      r.source === "MATHHUB" && typeof r.uri === "string",
  );

  const visibleResults = mathHubResults.slice(0, visibleCount);
  const isConfirmed = symbol?.hasConfirmed === true;

  async function handleConfirmAction() {
    if (!symbol) return;
    setDialogLoading(true);
    try {
      await confirmSymbolNotDuplicate({ data: { symbolId: symbol.id } });
      await queryClient.invalidateQueries({ queryKey: ["dedup-symbols"] });
    } finally {
      setDialogLoading(false);
      setDialogKind(null);
    }
  }

  async function handleUndoAction() {
    if (!symbol) return;
    setDialogLoading(true);
    try {
      await undoSymbolConfirmation({ data: { symbolId: symbol.id } });
      await queryClient.invalidateQueries({ queryKey: ["dedup-symbols"] });
    } finally {
      setDialogLoading(false);
      setDialogKind(null);
    }
  }

  return (
    <>
      <Paper withBorder p="lg" mb="md" radius="md">
        <Group align="flex-start" justify="space-between">
          {/* ── Left: symbol name + preview ── */}
          <Box w="40%">
            <Text fw={700} mb={4}>
              {symbolName}
            </Text>

            {isLoading && <Loader size="xs" mt="sm" />}

            {definition && (
              <Box mt="sm">
                <ExtractedTextPanel
                  extracts={extractedItems}
                  editingId={editingId}
                  selectedId={null}
                  onToggleEdit={handleToggleEdit}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onSelection={(extractId) => {
                    handleSelection("right", { extractId });
                  }}
                  onOpenSemanticPanel={() => setSemanticPanelOpen(true)}
                  showPageNumber={false}
                  showDefinitionMeta={false}
                  isLocked={false}
                />
              </Box>
            )}
          </Box>

          <Stack w="55%" gap="sm">
            {isSearching && <Loader size="xs" />}

            {visibleResults.map((r) => {
              const parsed = parseUri(r.uri);
              const safeUri = parsed.conceptUri;
              return (
                <MathHubSearchResult
                  key={safeUri}
                  safeUri={safeUri}
                  definition={definition!}
                  selectedDefiniendum={selectedDefiniendum}
                  setPendingPropagation={setPendingPropagation}
                />
              );
            })}

            {mathHubResults.length > 2 && (
              <Button
                size="xs"
                variant="subtle"
                onClick={() =>
                  setVisibleCount((prev) =>
                    prev >= mathHubResults.length ? 2 : prev + 3,
                  )
                }
              >
                {visibleCount >= mathHubResults.length
                  ? "Show Less"
                  : "Show More"}
              </Button>
            )}

            {mathHubResults.length === 0 && !isSearching && (
              <Text size="xs" c="dimmed">
                No results found in MathHub
              </Text>
            )}

            <Group gap="xs" mt="xs">
              <Button
                size="xs"
                variant="light"
                color="blue"
                disabled={isConfirmed}
                onClick={() => {
                  if (!symbol || isConfirmed) return;
                  setDialogKind("confirm");
                }}
              >
                NOT A DUPLICATE
              </Button>

              {isConfirmed && (
                <>
                  <ConfirmedIcon confirmedByName={confirmedByName} />
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => setDialogKind("undo")}
                  >
                    Undo
                  </Button>
                </>
              )}
            </Group>
          </Stack>
        </Group>
      </Paper>

      {dialogKind !== null && symbol && (
        <ConfirmationModal
          kind={dialogKind}
          symbolName={symbolName}
          opened={dialogKind !== null}
          loading={dialogLoading}
          onConfirm={
            dialogKind === "confirm" ? handleConfirmAction : handleUndoAction
          }
          onCancel={() => {
            if (!dialogLoading) setDialogKind(null);
          }}
        />
      )}

      {pendingPropagation && (
        <SymbolPropagationDialog
          opened={true}
          localSymbolUri={pendingPropagation.localSymbolUri}
          mathHubUri={pendingPropagation.mathHubUri}
          primaryDefinitionId={pendingPropagation.primaryDefinitionId}
          onReplaceNode={handleReplaceNode}
          onDone={() => setPendingPropagation(null)}
          onSkip={() => setPendingPropagation(null)}
        />
      )}

      {semanticPanelOpen && definition && (
        <SemanticPanel
          opened={semanticPanelOpen}
          onClose={() => setSemanticPanelOpen(false)}
          definition={definition}
          onReplaceNode={handleReplaceNodeLocal}
          onDeleteNode={handleDeleteNode}
        />
      )}

      {popup && (
        <SelectionPopup
          popup={popup}
          onClose={clearPopupOnly}
          onDefiniendum={() => {
            if (!selection?.extractId || !selection.text) return;

            setDefExtractId(selection.extractId);
            setDefExtractText(selection.text);
            setDefDialogOpen(true);
          }}
          onSymbolicRef={() => {
            if (!selection?.extractId || !selection.text) return;

            setSavedSelection(selection);
            setDefExtractId(selection.extractId);
            setConceptUri(selection.text);
            setEditingNodeId(null);
            setMode("SymbolicRef");

            clearPopupOnly();
          }}
        />
      )}

      <DefiniendumDialog
        opened={defDialogOpen}
        extractedText={defExtractText}
        onSubmit={handleDefiniendumSubmit}
        onClose={() => setDefDialogOpen(false)}
      />

      {mode === "SymbolicRef" && (
        <SymbolicRef
          conceptUri={conceptUri}
          onClose={() => setMode(null)}
          onSelect={handleSaveSymbolicRef}
        />
      )}
    </>
  );
}
