import { queryClient } from "@/queryClient";
import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
import { parseUri } from "@/server/parseUri";
import { SymbolSearchResult, useSymbolSearch } from "@/server/useSymbolSearch";
import { getDefinitionBySymbol } from "@/serverFns/symbol.server";
import {
  updateDefinitionAst,
  UpdateDefinitionAstResult,
} from "@/serverFns/updateDefinition.server";
import { assertFtmlStatement } from "@/types/ftml.types";
import { OnReplaceNode, SemanticDefinition } from "@/types/Semantic.types";
import {
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Popover,
  Stack,
  Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FtmlPreview } from "./FtmlPreview";
import { RenderSymbolicUri } from "./RenderUri";
import { SymbolPropagationDialog } from "./SymbolPropagationDialog";

const handleReplaceNode: OnReplaceNode = async (
  definitionId,
  target,
  payload,
): Promise<UpdateDefinitionAstResult> => {
  const result = await updateDefinitionAst({
    data: {
      definitionId,
      operation: {
        kind: "replaceSemantic",
        target,
        payload,
      },
    },
  });

  await queryClient.invalidateQueries({
    queryKey: ["dedup-symbols"],
  });

  return result;
};

type MathHubItemProps = {
  safeUri: string;
  definition: SemanticDefinition;
  selectedDefiniendum: { uri: string } | null;
  setPendingPropagation: (data: {
    localSymbolUri: string;
    mathHubUri: string;
    primaryDefinitionId: string;
  }) => void;
};

function MathHubItem({
  safeUri,
  definition,
  selectedDefiniendum,
  setPendingPropagation,
}: MathHubItemProps) {
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
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}

export function Duplicate({ symbolName }: { symbolName: string }) {
  const [pendingPropagation, setPendingPropagation] = useState<{
    localSymbolUri: string;
    mathHubUri: string;
    primaryDefinitionId: string;
  } | null>(null);

  const [visibleCount, setVisibleCount] = useState(2);

  const { data: rawDefinition, isLoading } = useQuery({
    queryKey: ["definition-by-symbol", symbolName],
    queryFn: () => getDefinitionBySymbol({ data: symbolName }),
  });

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
  const hasSearched = searchQuery.trim().length > 0;

  const { results, isLoading: isSearching } = useSymbolSearch(
    searchQuery,
    hasSearched,
  );

  if (!isLoading && !definition) return null;

  const mathHubResults = results.filter(
    (r): r is Extract<SymbolSearchResult, { source: "MATHHUB" }> =>
      r.source === "MATHHUB" && typeof r.uri === "string",
  );

  const visibleResults = mathHubResults.slice(0, visibleCount);

  return (
    <>
      <Paper withBorder p="lg" mb="md">
        <Group align="flex-start" justify="space-between">
          <Box w="40%">
            <Text fw={700}>{symbolName}</Text>

            {isLoading && <Loader size="xs" mt="sm" />}

            {definition && (
              <Paper mt="md" p="md" withBorder bg="blue.0">
                <Box h={140}>
                  <FtmlPreview
                    ftmlAst={definition.statement}
                    docId={definition.id}
                  />
                </Box>
              </Paper>
            )}
          </Box>

          <Stack w="55%">
            {isSearching && <Loader size="xs" />}

            {visibleResults.map((r) => {
              const parsed = parseUri(r.uri);
              const safeUri = parsed.conceptUri;

              return (
                <MathHubItem
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

            {hasSearched && mathHubResults.length === 0 && !isSearching && (
              <Text size="xs" c="dimmed">
                No results found in MathHub
              </Text>
            )}

            <Button size="xs" variant="light">
              NOT A DUPLICATE
            </Button>
          </Stack>
        </Group>
      </Paper>

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
    </>
  );
}
