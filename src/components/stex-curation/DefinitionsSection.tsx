import { ExtractedItem } from "@/server/text-selection";
import { FtmlStatement } from "@/types/ftml.types";
import {
  Box,
  Button,
  Group,
  Loader,
  Menu,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { ChevronDown } from "lucide-react";
import { ExtractedTextPanel } from "../ExtractedTextList";
import { StexStatus } from "./useStexCurationData";

type StatusConf = {
  color: string;
  label: string;
};

export type DefinitionsSectionProps = {
  data: {
    definitions: ExtractedItem[];
    isLoading: boolean;
  };
  state: {
    editingId: string | null;
  };
  status: {
    value: StexStatus;
    conf: StatusConf;
    discardReasonFromServer: string | null;
  };
  actions: {
    onStatusChange: (
      status: "EXTRACTED" | "FINALIZED_IN_FILE" | "SUBMITTED_TO_MATHHUB",
    ) => void;
    onOpenDiscard: () => void;
    onToggleEdit: (id: string) => void;
    onUpdate: (id: string, statement: FtmlStatement) => Promise<void>;
    onDownload: () => void;
    onDelete: (id: string) => void;
    onSelection: (extractId: string) => void;
    onOpenSemanticPanel: (definitionId: string) => void;
    onRecomputeReferences: (definitionId: string) => void;
    onEditDefinitionMeta: (item: ExtractedItem) => void;
    onOpenLatexPreview: () => void;
  };
};

export function DefinitionsSection({
  data,
  state,
  status,
  actions,
}: DefinitionsSectionProps) {
  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        px="md"
        pt="sm"
        pb="xs"
        style={{ borderBottom: "1px solid var(--mantine-color-gray-1)" }}
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text size="xs" fw={700} c="gray.6" tt="uppercase" lts={0.5}>
            Definitions
          </Text>

          <Group gap={6} wrap="nowrap">
            <Menu shadow="md" width={230} position="bottom-end">
              <Menu.Target>
                {status.value === "DISCARDED" ? (
                  <Tooltip
                    withArrow
                    multiline
                    w={260}
                    label={
                      <Stack gap={2}>
                        <Text fw={600} size="xs">
                          Discarded
                        </Text>
                        <Text size="xs">
                          Reason:{" "}
                          {status.discardReasonFromServer || "Not specified"}
                        </Text>
                      </Stack>
                    }
                  >
                    <Button
                      size="xs"
                      variant="light"
                      color={status.conf.color}
                      rightSection={<ChevronDown size={12} />}
                      styles={{ section: { marginLeft: 4 } }}
                    >
                      {status.conf.label}
                    </Button>
                  </Tooltip>
                ) : (
                  <Button
                    size="xs"
                    variant="light"
                    color={status.conf.color}
                    rightSection={<ChevronDown size={12} />}
                    styles={{ section: { marginLeft: 4 } }}
                  >
                    {status.conf.label}
                  </Button>
                )}
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Status Actions</Menu.Label>
                <Menu.Item onClick={() => actions.onStatusChange("EXTRACTED")}>
                  Extracted
                </Menu.Item>
                <Menu.Item
                  onClick={() => actions.onStatusChange("FINALIZED_IN_FILE")}
                >
                  Finalized
                </Menu.Item>
                <Menu.Item
                  onClick={() => actions.onStatusChange("SUBMITTED_TO_MATHHUB")}
                >
                  Submitted to MathHub
                </Menu.Item>
                <Menu.Divider />

                <Menu.Item color="red" onClick={actions.onOpenDiscard}>
                  Discard
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Box>

      <ScrollArea
        type="auto"
        scrollbarSize={6}
        style={{ flex: 1 }}
        px="md"
        py="sm"
      >
        {data.isLoading && (
          <Group justify="center" py="lg">
            <Loader size="sm" />
          </Group>
        )}

        {!data.isLoading && (
          <Stack gap="md">
            <ExtractedTextPanel
              extracts={data.definitions}
              editingId={state.editingId}
              selectedId={null}
              onToggleEdit={actions.onToggleEdit}
              onUpdate={actions.onUpdate}
              onDownload={actions.onDownload}
              onDelete={actions.onDelete}
              onSelection={actions.onSelection}
              onOpenSemanticPanel={actions.onOpenSemanticPanel}
              onRecomputeReferences={actions.onRecomputeReferences}
              showPageNumber={false}
              showDefinitionMeta
              showDefinitionMetaIconOnly
              onEditDefinitionMeta={actions.onEditDefinitionMeta}
              isLocked={
                status.value === "SUBMITTED_TO_MATHHUB" ||
                status.value === "DISCARDED"
              }
              onOpenLatexPreview={actions.onOpenLatexPreview}
            />
          </Stack>
        )}
      </ScrollArea>
    </Box>
  );
}
