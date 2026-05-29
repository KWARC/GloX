import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
import { useSymbolSearch } from "@/server/useSymbolSearch";
import {
  DbSymbolResult,
  MathhubResult,
  SelectedNode,
  SemanticDefinition,
} from "@/types/Semantic.types";
import { useMemo, useState } from "react";

export type PendingPropagation = {
  localSymbolUri: string;
  mathHubUri: string;
  primaryDefinitionId: string;
};

export type PendingMathHubToLocal = {
  mathHubUri: string;
  localSymbolUri: string;
  targetType: "definiendum" | "symref";
  primaryDefinitionId: string;
};

export function useSemanticPanelState(definition: SemanticDefinition | null) {
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [selectedUri, setSelectedUri] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingNodeUri, setEditingNodeUri] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);
  const [pendingPropagation, setPendingPropagation] =
    useState<PendingPropagation | null>(null);
  const [pendingMathHubToLocal, setPendingMathHubToLocal] =
    useState<PendingMathHubToLocal | null>(null);

  const { definienda, symbolicRefs } = useMemo(() => {
    if (!definition) return { definienda: [], symbolicRefs: [] };
    return extractSemanticIndex(definition.statement, definition);
  }, [definition]);

  const { results, isLoading: searchLoading } = useSymbolSearch(searchQuery);

  const selectedDefiniendum = definienda.find(
    (d) => d.uri === selectedNode?.uri,
  );

  const selectedSymref = symbolicRefs.find((s) => s.uri === selectedNode?.uri);

  const canMakeNewSymbol =
    selectedNode?.type === "definiendum" &&
    !!selectedUri &&
    selectedDefiniendum !== undefined &&
    !selectedDefiniendum.symdecl;

  const dbResults: DbSymbolResult[] = useMemo(
    () => results.filter((r): r is DbSymbolResult => r.source === "DB"),
    [results],
  );

  const mathhubResults: MathhubResult[] = useMemo(
    () => results.filter((r): r is MathhubResult => r.source === "MATHHUB"),
    [results],
  );

  const hasSearched = searchQuery.trim().length > 0;

  function reset() {
    setSearchInput("");
    setSearchQuery("");
    setSelectedNode(null);
    setSelectedUri("");
  }

  return {
    selectedNode,
    setSelectedNode,
    selectedUri,
    setSelectedUri,
    searchInput,
    setSearchInput,
    searchQuery,
    setSearchQuery,
    editingNodeUri,
    setEditingNodeUri,
    renameValue,
    setRenameValue,
    savingRename,
    setSavingRename,
    pendingPropagation,
    setPendingPropagation,
    pendingMathHubToLocal,
    setPendingMathHubToLocal,
    definienda,
    symbolicRefs,
    selectedDefiniendum,
    selectedSymref,
    canMakeNewSymbol,
    dbResults,
    mathhubResults,
    searchLoading,
    hasSearched,
    reset,
  };
}

export type SemanticPanelState = ReturnType<typeof useSemanticPanelState>;
