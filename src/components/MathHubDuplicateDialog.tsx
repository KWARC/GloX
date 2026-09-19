import { queryClient } from "@/queryClient";
import {
  canDeleteDeclaringBlockForMathHubDuplicate,
  type DefiningBlockAction,
} from "@/server/ftml/replaceLocalSymbolWithMathHub";
import {
  listLocalSymbolUriHits,
  replaceLocalSymbolWithMathHub,
  type LocalSymbolUriHitView,
} from "@/serverFns/uriRetarget.server";
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Radio,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FtmlPreview } from "./FtmlPreview";

const MODULE_FIELD_LABEL: Record<
  Extract<LocalSymbolUriHitView, { kind: "moduleStatement" }>["field"],
  string
> = {
  title: "Title",
  inhalt: "Inhalt",
  lernziele: "Lernziele",
};

const DELETE_BLOCK_DISABLED_TOOLTIP =
  "This block also declares other local symbols. Remove or merge those first, or keep the definition block.";

const WARNING_BY_ACTION: Record<DefiningBlockAction, string> = {
  keep: "Only the symbol declaration is removed from the block. The content stays.",
  delete:
    "The entire FloDown block where this symbol was defined will be deleted permanently.",
};

interface MathHubDuplicateDialogProps {
  opened: boolean;
  localSymbolUri: string;
  mathHubUri: string;
  onDone: () => void;
  onSkip: () => void;
}

export function MathHubDuplicateDialog({
  opened,
  localSymbolUri,
  mathHubUri,
  onDone,
  onSkip,
}: MathHubDuplicateDialogProps) {
  const [applying, setApplying] = useState(false);
  const [definingBlockAction, setDefiningBlockAction] =
    useState<DefiningBlockAction | null>(null);

  const { data: hits = [], isLoading } = useQuery<LocalSymbolUriHitView[]>({
    queryKey: ["local-symbol-uri-hits", localSymbolUri],
    queryFn: () => listLocalSymbolUriHits({ data: { localSymbolUri } }),
    enabled: opened,
  });

  useEffect(() => {
    if (opened) setDefiningBlockAction(null);
  }, [opened, localSymbolUri, mathHubUri]);

  const declaringHit = useMemo(
    () =>
      hits.find(
        (hit): hit is Extract<LocalSymbolUriHitView, { kind: "floDown" }> =>
          hit.kind === "floDown" &&
          hit.declaredSymbolsInfo.some((d) => d.symbolUri === localSymbolUri),
      ),
    [hits, localSymbolUri],
  );

  const deleteBlockAllowed =
    declaringHit?.kind === "floDown"
      ? canDeleteDeclaringBlockForMathHubDuplicate(
          declaringHit.declaredSymbolsInfo,
          localSymbolUri,
        )
      : false;

  async function handleApply() {
    if (!definingBlockAction) return;
    setApplying(true);
    try {
      await replaceLocalSymbolWithMathHub({
        data: { localSymbolUri, mathHubUri, definingBlockAction },
      });
      await queryClient.invalidateQueries();
      onDone();
    } finally {
      setApplying(false);
    }
  }

  const deleteRadio = (
    <Radio
      value="delete"
      label="Delete the entire definition block"
      disabled={!deleteBlockAllowed}
    />
  );

  return (
    <Modal
      opened={opened}
      onClose={onSkip}
      title={
        <Stack gap={2}>
          <Text fw={600} size="md">
            Mark as MathHub duplicate
          </Text>
          <Text size="xs" c="dimmed">
            This local symbol is the same concept as the chosen MathHub symbol.
            Current references will use the MathHub URI and the local declaration
            is removed. Choose what happens to the block where the symbol was
            defined.
          </Text>
        </Stack>
      }
      size="lg"
      centered
      padding="lg"
    >
      <Stack gap="md">
        <Radio.Group
          value={definingBlockAction ?? ""}
          onChange={(value) =>
            setDefiningBlockAction(value as DefiningBlockAction)
          }
          label="Defining block"
          withAsterisk
        >
          <Stack gap="xs" mt="xs">
            <Radio
              value="keep"
              label="Keep the definition block (remove declaration only)"
            />
            {deleteBlockAllowed ? (
              deleteRadio
            ) : (
              <Tooltip label={DELETE_BLOCK_DISABLED_TOOLTIP} multiline w={280}>
                <Box>{deleteRadio}</Box>
              </Tooltip>
            )}
          </Stack>
        </Radio.Group>

        {definingBlockAction && (
          <Paper p="sm" withBorder bg="yellow.0" radius="md">
            <Group gap="xs" align="flex-start" wrap="nowrap">
              <ThemeIcon color="yellow" variant="light" size="sm" radius="xl">
                <IconAlertTriangle size={14} />
              </ThemeIcon>
              <Text size="sm">{WARNING_BY_ACTION[definingBlockAction]}</Text>
            </Group>
          </Paper>
        )}

        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
          </Group>
        ) : hits.length === 0 ? (
          <Paper p="md" withBorder bg="gray.0" radius="md">
            <Text size="sm" c="dimmed" ta="center">
              No statements currently reference this symbol. Applying still drops
              the local declaration if it exists.
            </Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              {hits.length} statement{hits.length !== 1 ? "s" : ""} will be
              updated
            </Text>

            <Stack gap="xs" mah={280} style={{ overflowY: "auto" }}>
              {hits.map((hit) =>
                hit.kind === "floDown" ? (
                  <Paper
                    key={`flo-${hit.id}`}
                    withBorder
                    p="sm"
                    radius="md"
                    bg="gray.0"
                  >
                    <Stack gap={6}>
                      <Group gap="xs" wrap="nowrap">
                        <Text
                          size="xs"
                          ff="monospace"
                          truncate
                          style={{ flex: 1 }}
                        >
                          {[hit.futureRepo, hit.filePath, hit.fileName].join(
                            " / ",
                          )}
                        </Text>
                        {hit.status === "DISCARDED" && (
                          <Badge size="xs" color="gray" variant="light">
                            Discarded
                          </Badge>
                        )}
                      </Group>
                      <Box
                        style={{
                          maxHeight: 120,
                          overflow: "hidden",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                          padding: 4,
                          background: "#fff",
                        }}
                      >
                        <FtmlPreview
                          ftmlAst={hit.statement}
                          docId={hit.id}
                          declaredSymbolsInfo={hit.declaredSymbolsInfo}
                        />
                      </Box>
                    </Stack>
                  </Paper>
                ) : (
                  <Paper
                    key={`mod-${hit.moduleId}-${hit.field}`}
                    withBorder
                    p="sm"
                    radius="md"
                    bg="gray.0"
                  >
                    <Stack gap={6}>
                      <Text size="xs">
                        Module {hit.moduleId} ·{" "}
                        {MODULE_FIELD_LABEL[hit.field]}
                      </Text>
                      <Box
                        style={{
                          maxHeight: 120,
                          overflow: "hidden",
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                          padding: 4,
                          background: "#fff",
                        }}
                      >
                        <FtmlPreview
                          ftmlAst={hit.statement}
                          docId={`${hit.moduleDescriptionId}-${hit.field}`}
                        />
                      </Box>
                    </Stack>
                  </Paper>
                ),
              )}
            </Stack>
          </Stack>
        )}
      </Stack>

      <Group justify="flex-end" mt="lg" gap="sm">
        <Button variant="default" onClick={onSkip} loading={applying}>
          Cancel
        </Button>
        <Button
          onClick={handleApply}
          loading={applying}
          disabled={isLoading || definingBlockAction === null}
        >
          Deduplicate symbol
        </Button>
      </Group>
    </Modal>
  );
}
