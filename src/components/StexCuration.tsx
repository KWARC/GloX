import { queryClient } from "@/queryClient";
import { ExtractedItem } from "@/server/text-selection";
import {
  deleteDefinition,
  updateDefinition,
} from "@/serverFns/extractDefinition.server";
import {
  FileIdentity,
  getDefinitionsByIdentity,
} from "@/serverFns/latex.server";
import { FtmlStatement } from "@/types/ftml.types";
import {
  Badge,
  Box,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { FolderSymlink } from "lucide-react";
import { useState } from "react";
import { DefinitionIdentityDialog } from "./DefinitionFilePathDialog";
import { ExtractedTextPanel } from "./ExtractedTextList";

export function StexCuration({ identity }: { identity: FileIdentity }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [identityEditOpen, setIdentityEditOpen] = useState(false);
  const [identityTarget, setIdentityTarget] = useState<ExtractedItem | null>(
    null,
  );

  const [semanticPanelOpen, setSemanticPanelOpen] = useState(false);
  const [semanticPanelDefId, setSemanticPanelDefId] = useState<string | null>(
    null,
  );

  const { data, isLoading } = useQuery({
    queryKey: ["definitionsByIdentity", identity],
    queryFn: () =>
      getDefinitionsByIdentity({
        data: identity,
      }),
  });

  const hasSymbols = (data?.symbols.length ?? 0) > 0;
  function handleEditIdentity(item: ExtractedItem) {
    setIdentityTarget(item);
    setIdentityEditOpen(true);
  }

  async function handleDelete(id: string) {
    await deleteDefinition({ data: { id } });
    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
  }

  async function handleUpdate(id: string, statement: FtmlStatement) {
    await updateDefinition({ data: { id, statement } });
    setEditingId(null);
    await queryClient.invalidateQueries({
      queryKey: ["definitionsByIdentity", identity],
    });
  }

  function handleToggleEdit(id: string) {
    setEditingId((prev) => (prev === id ? null : id));
  }

  function handleOpenSemanticPanel(id: string) {
    setSemanticPanelDefId(id);
    setSemanticPanelOpen(true);
  }
  return (
    <>
      <Paper
        withBorder
        p={0}
        radius="md"
        style={{
          aspectRatio: "1 / 1",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          transition: "box-shadow 150ms ease, border-color 150ms ease",
          borderColor: "var(--mantine-color-gray-3)",
        }}
        styles={{
          root: {
            "&:hover": {
              boxShadow: "var(--mantine-shadow-sm)",
              borderColor: "var(--mantine-color-gray-4)",
            },
          },
        }}
      >
        <Stack gap={0} style={{ height: "100%" }}>
          <Box
            px="md"
            py="sm"
            style={{
              borderBottom: "1px solid var(--mantine-color-gray-1)",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            <Text size="xs" fw={600} c="gray.7" mb={6} tt="uppercase">
              Symbol Declared
            </Text>

            {hasSymbols ? (
              <Group gap={6}>
                {data?.symbols.map((symbol, index) => (
                  <Badge
                    key={`${symbol.id}-${index}`}
                    size="sm"
                    variant="light"
                    color="blue"
                    styles={{
                      root: {
                        textTransform: "none",
                        fontWeight: 500,
                      },
                    }}
                  >
                    {symbol.label}
                  </Badge>
                ))}
              </Group>
            ) : (
              <Text size="xs" c="dimmed">
                No symbol declared
              </Text>
            )}
          </Box>

          <Box
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box px="md" pt="sm" pb="xs">
              <Text size="xs" fw={600} c="gray.7" tt="uppercase">
                Definitions
              </Text>
            </Box>

            <ScrollArea
              type="auto"
              scrollbarSize={6}
              style={{ flex: 1 }}
              px="md"
              pb="md"
            >
              {isLoading && (
                <Group justify="center" py="lg">
                  <Loader size="sm" />
                </Group>
              )}

              {!isLoading && (
                <Stack gap="md">
                  <ExtractedTextPanel
                    extracts={data?.definitions ?? []}
                    editingId={editingId}
                    selectedId={null}
                    onToggleEdit={handleToggleEdit}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onSelection={() => {}}
                    onOpenSemanticPanel={handleOpenSemanticPanel}
                    showPageNumber={false}
                    showIdentityPerItem
                    showIdentityIconOnly
                    onEditIdentity={handleEditIdentity}
                  />
                </Stack>
              )}
            </ScrollArea>
          </Box>
          <Box
            px="md"
            pt="sm"
            pb="xs"
            style={{
              borderBottom: "1px solid var(--mantine-color-gray-2)",
            }}
          >
            <Group
              gap={6}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setIdentityTarget(null); // not per-definition
                setIdentityEditOpen(true);
              }}
            >
              <FolderSymlink size={14} />
              <Text size="xs" c="dimmed" ff="monospace" lh={1.4}>
                {[
                  identity.futureRepo,
                  identity.filePath,
                  identity.fileName,
                  identity.language,
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </Text>
            </Group>
          </Box>
        </Stack>
      </Paper>
      <DefinitionIdentityDialog
        opened={identityEditOpen}
        onClose={() => {
          setIdentityEditOpen(false);
          setIdentityTarget(null);
        }}
        definition={identityTarget}
        bulkIdentity={identity}
        invalidateKey={["definitionsByIdentity", identity]}
      />
    </>
  );
}
