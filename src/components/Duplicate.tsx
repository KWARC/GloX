import { queryClient } from "@/queryClient";
import { extractSemanticIndex } from "@/server/ftml/semanticIndex";
import { parseUri } from "@/server/parseUri";
import { SymbolSearchResult, useSymbolSearch } from "@/server/useSymbolSearch";
import {
  getAllSymbols,
  getDefinitionBySymbol,
} from "@/serverFns/symbol.server";
import {
  confirmSymbolNotDuplicate,
  undoSymbolConfirmation,
} from "@/serverFns/symbolDuplicate.server";
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
  Modal,
  Paper,
  Popover,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FtmlPreview } from "./FtmlPreview";
import { RenderSymbolicUri } from "./RenderUri";
import { SymbolPropagationDialog } from "./SymbolPropagationDialog";

type PendingPropagation = {
  localSymbolUri: string;
  mathHubUri: string;
  primaryDefinitionId: string;
};

type ConfirmDialogKind = "confirm" | "undo";

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

type ConfirmationModalProps = {
  kind: ConfirmDialogKind;
  symbolName: string;
  opened: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmationModal({
  kind,
  symbolName,
  opened,
  loading,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const isConfirm = kind === "confirm";

  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={
        <Group gap="xs">
          <ThemeIcon
            size="sm"
            radius="xl"
            color={isConfirm ? "blue" : "orange"}
            variant="light"
          >
            <IconInfoCircle size={14} />
          </ThemeIcon>
          <Text fw={700} size="sm">
            {isConfirm ? "Confirm Action" : "Undo Confirmation"}
          </Text>
        </Group>
      }
      centered
      size="sm"
      padding="lg"
      radius="md"
    >
      <Stack gap="md">
        {isConfirm ? (
          <Stack gap="xs">
            <Text size="sm">
              You are marking{" "}
              <Text span fw={700} ff="monospace">
                {symbolName}
              </Text>{" "}
              as{" "}
              <Text span fw={700}>
                NOT a duplicate
              </Text>
              .
            </Text>
            <Paper
              p="sm"
              radius="md"
              bg="blue.0"
              withBorder
              style={{ borderColor: "var(--mantine-color-blue-3)" }}
            >
              <Text size="sm" c="blue.8">
                This means you have verified that it does not exist on MathHub.
              </Text>
            </Paper>
            <Text size="sm" c="dimmed">
              Do you want to proceed?
            </Text>
          </Stack>
        ) : (
          <Stack gap="xs">
            <Text size="sm">
              This symbol was previously confirmed as{" "}
              <Text span fw={700}>
                NOT a duplicate
              </Text>
              .
            </Text>
            <Paper
              p="sm"
              radius="md"
              bg="orange.0"
              withBorder
              style={{ borderColor: "var(--mantine-color-orange-3)" }}
            >
              <Text size="sm" c="orange.8">
                Undoing this will remove the confirmation and attribution.
              </Text>
            </Paper>
            <Text size="sm" c="dimmed">
              Do you want to undo this decision?
            </Text>
          </Stack>
        )}

        <Group justify="flex-end" gap="sm" mt="xs">
          <Button
            variant="default"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            color={isConfirm ? "blue" : "orange"}
            loading={loading}
            onClick={onConfirm}
          >
            {isConfirm ? "Confirm" : "Undo"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

type ConfirmedIconProps = {
  confirmedByName: string | null;
};

function ConfirmedIcon({ confirmedByName }: ConfirmedIconProps) {
  return (
    <Tooltip
      label={
        <Stack gap={2}>
          <Text size="xs" fw={600}>
            This symbol is not a duplicate.
          </Text>
          {confirmedByName && (
            <Text size="xs" c="dimmed">
              Confirmed by: {confirmedByName}
            </Text>
          )}
        </Stack>
      }
      withArrow
      multiline
      w={220}
      position="top"
    >
      <ThemeIcon
        size="sm"
        radius="xl"
        color="green"
        variant="light"
        style={{ cursor: "help" }}
      >
        <IconInfoCircle size={13} />
      </ThemeIcon>
    </Tooltip>
  );
}

type MathHubItemProps = {
  safeUri: string;
  definition: SemanticDefinition;
  selectedDefiniendum: { uri: string } | null;
  setPendingPropagation: (data: PendingPropagation) => void;
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
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}

export function Duplicate({ symbolName }: { symbolName: string }) {
  const [pendingPropagation, setPendingPropagation] =
    useState<PendingPropagation | null>(null);
  const [visibleCount, setVisibleCount] = useState(2);
  const [dialogKind, setDialogKind] = useState<ConfirmDialogKind | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);

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
              <Paper mt="sm" p="md" withBorder bg="blue.0">
                <Box h={140}>
                  <FtmlPreview
                    ftmlAst={definition.statement}
                    docId={definition.id}
                  />
                </Box>
              </Paper>
            )}
          </Box>

          <Stack w="55%" gap="sm">
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
    </>
  );
}
