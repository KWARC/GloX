import { Box, Button, Group, Loader, Paper, Stack, Text, Popover } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useSymbolSearch } from "@/server/useSymbolSearch";
import { getDefinitionBySymbol } from "@/serverFns/symbol.server";

import {
  updateDefinitionAst,
  UpdateDefinitionAstResult,
} from "@/serverFns/updateDefinition.server";

import { queryClient } from "@/queryClient";
import { OnReplaceNode } from "@/types/Semantic.types";

import { RenderSymbolicUri } from "./RenderUri";
import { FtmlPreview } from "./FtmlPreview";
import { assertFtmlStatement } from "@/types/ftml.types";

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

export function DedupRow({ symbolName }: any) {
  const { data: definition, isLoading } = useQuery({
    queryKey: ["definition-by-symbol", symbolName],
    queryFn: () => getDefinitionBySymbol({ data: symbolName }),
  });

  const { results, isLoading: isSearching } = useSymbolSearch(symbolName, !!symbolName);

  const mathHubResults = results.filter((r) => r.source === "MATHHUB").slice(0, 2);

  return (
    <Paper withBorder p="lg">
      <Group align="flex-start" justify="space-between">
        <Box w="40%">
          <Text fw={700} size="lg">
            {symbolName}
          </Text>

          {isLoading && <Loader size="xs" mt="xs" />}

          {!definition && !isLoading && (
            <Text size="xs" c="dimmed" mt="xs">
              No definition found
            </Text>
          )}

          {definition && (
            <Paper mt="md" p="md" withBorder bg="blue.0">
              <Box h={120}>
                <FtmlPreview
                  ftmlAst={assertFtmlStatement(definition.statement)}
                  docId={definition.id}
                />
              </Box>
            </Paper>
          )}
        </Box>

        <Stack w="55%">
          {isSearching && <Loader size="xs" />}

          {mathHubResults.length > 0
            ? mathHubResults.map((r: any) => {
                const [opened, setOpened] = useState(false);

                return (
                  <Popover key={r.uri} opened={opened} position="right" withArrow width={350}>
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

                          <Button size="xs">Use this</Button>
                        </Group>
                      </Paper>
                    </Popover.Target>

                    <Popover.Dropdown
                      onMouseEnter={() => setOpened(true)}
                      onMouseLeave={() => setOpened(false)}
                    >
                      <Stack gap="xs">
                        <Text size="xs" c="dimmed">
                          Preview
                        </Text>

                        <Box h={150}>
                          <iframe
                            src={r.uri.replace("http:", "https:")}
                            style={{
                              width: "100%",
                              height: "100%",
                              border: "none",
                            }}
                          />
                        </Box>
                      </Stack>
                    </Popover.Dropdown>
                  </Popover>
                );
              })
            : !isSearching && (
                <Text size="xs" c="dimmed">
                  No MathHub results
                </Text>
              )}

          <Button size="xs" variant="light" color="gray">
            NOT A DUPLICATE
          </Button>
        </Stack>
      </Group>
    </Paper>
  );
}
