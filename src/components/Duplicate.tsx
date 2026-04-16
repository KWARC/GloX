import { queryClient } from "@/queryClient";
import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
import { useSymbolSearch } from "@/server/useSymbolSearch";
import { getDefinitionBySymbol } from "@/serverFns/symbol.server";
import {
  updateDefinitionAst,
  UpdateDefinitionAstResult,
} from "@/serverFns/updateDefinition.server";
import { assertFtmlStatement } from "@/types/ftml.types";
import { OnReplaceNode } from "@/types/Semantic.types";
import { Box, Button, Group, Loader, Paper, Popover, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FtmlPreview } from "./FtmlPreview";
import { RenderSymbolicUri } from "./RenderUri";
import { SymbolPropagationDialog } from "./SymbolPropagationDialog";

type DefinitionType = {
  id: string;
  statement: unknown;
};

type DefiniendumType = {
  uri: string;
  text: string;
  symdecl: boolean;
};

type MathHubResultType = {
  uri: string;
  source: "MATHHUB";
};

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
  r: MathHubResultType;
  definition: DefinitionType | null | undefined;
  selectedDefiniendum: DefiniendumType | null;
  setPendingPropagation: (data: {
    localSymbolUri: string;
    mathHubUri: string;
    primaryDefinitionId: string;
  }) => void;
};

function MathHubItem({
  r,
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
              <RenderSymbolicUri uri={r.uri} />
            </Box>

            <Button
              size="xs"
              onClick={(e) => {
                e.stopPropagation();

                if (!definition?.id || !selectedDefiniendum?.uri) return;

                setPendingPropagation({
                  localSymbolUri: selectedDefiniendum.uri,
                  mathHubUri: r.uri,
                  primaryDefinitionId: definition.id,
                });
              }}
            >
              Use this
            </Button>
          </Group>
        </Paper>
      </Popover.Target>

      <Popover.Dropdown>
        <Box h={150}>
          <iframe
            src={r.uri.replace("http:", "https:")}
            style={{ width: "100%", height: "100%", border: "none" }}
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

  const { data: definition, isLoading } = useQuery<DefinitionType | null>({
    queryKey: ["definition-by-symbol", symbolName],
    queryFn: () => getDefinitionBySymbol({ data: symbolName }),
  });

  const parsedStatement = useMemo(() => {
    if (!definition?.statement) return null;
    try {
      return assertFtmlStatement(definition.statement);
    } catch {
      return null;
    }
  }, [definition]);

  const selectedDefiniendum = useMemo<DefiniendumType | null>(() => {
    if (!parsedStatement || !definition) return null;

    const { definienda } = extractSemanticIndex(parsedStatement, {
      id: definition.id,
      statement: parsedStatement,
    } as never);

    return definienda.find((d) => d.text === symbolName) || definienda[0] || null;
  }, [parsedStatement, definition, symbolName]);

  const { results, isLoading: isSearching } = useSymbolSearch(symbolName, !!symbolName);

  if (!isLoading && !definition) return null;

  const mathHubResults: MathHubResultType[] = results
    .filter((r): r is MathHubResultType => r.source === "MATHHUB" && typeof r.uri === "string")
    .slice(0, 2);

  return (
    <>
      <Paper withBorder p="lg" mb="md">
        <Group align="flex-start" justify="space-between">
          <Box w="40%">
            <Text fw={700}>{symbolName}</Text>

            {isLoading && <Loader size="xs" mt="sm" />}

            {parsedStatement && definition?.id && (
              <Paper mt="md" p="md" withBorder bg="blue.0">
                <Box h={140}>
                  <FtmlPreview ftmlAst={parsedStatement} docId={definition.id} />
                </Box>
              </Paper>
            )}
          </Box>

          <Stack w="55%">
            {isSearching && <Loader size="xs" />}

            {mathHubResults.length > 0
              ? mathHubResults.map((r) => (
                  <MathHubItem
                    key={r.uri}
                    r={r}
                    definition={definition}
                    selectedDefiniendum={selectedDefiniendum}
                    setPendingPropagation={setPendingPropagation}
                  />
                ))
              : !isSearching && (
                  <Text size="xs" c="dimmed">
                    No MathHub results found
                  </Text>
                )}

            <Button size="xs" variant="light" color="gray">
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
