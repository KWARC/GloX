import { IndexStatusMenu } from "@/components/IndexStatusMenu";
import { ModuleDefinitionsSection } from "@/components/module-descriptions/ModuleDefinitionsSection";
import { ModuleDescriptionLatexModal } from "@/components/module-descriptions/ModuleDescriptionLatexModal";
import { ModuleStatementsSection } from "@/components/module-descriptions/ModuleStatementsSection";
import { generateModuleDescriptionTexPreview } from "@/lib/moduleDescriptionTex";
import type { TexFilePreview } from "@/lib/moduleDescriptionTex";
import {
  deleteModuleDescription,
  getModuleDescriptionPage,
  createModuleDescription,
  resetModuleSemantics,
  updateModuleDescriptionIndexStatus,
} from "@/serverFns/moduleDescription.server";
import { INDEX_STATUS_CONFIG, IndexStatus } from "@/types/indexStatus";
import {
  Alert,
  Badge,
  Box,
  Button,
  Flex,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { currentUser } from "@/server/auth/currentUser";
import { useState } from "react";

export const Route = createFileRoute("/module-description/$moduleId")({
  loader: async () => {
    const user = await currentUser();
    if (!user?.loggedIn) {
      throw redirect({ to: "/login" });
    }
    const role = user.user?.role;
    if (role !== "ADMIN" && role !== "CURATOR" && role !== "EXTRACTOR") {
      throw redirect({ to: "/" });
    }
    return null;
  },
  component: ModuleDescriptionDetailPage,
});

function ModuleDescriptionDetailPage() {
  const { moduleId } = Route.useParams();
  const isTablet = useMediaQuery("(max-width: 768px)");
  const queryClient = useQueryClient();
  const { data: auth } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
  });

  const role = auth?.user?.role;
  const canPreviewTex = role === "ADMIN" || role === "CURATOR";
  const canEditStatus = role === "ADMIN" || role === "CURATOR";

  const [futureRepo, setFutureRepo] = useState("courses/FAU/module-descriptions");
  const [modulesFilePath, setModulesFilePath] = useState("modules");
  const [defsFilePath, setDefsFilePath] = useState("defs");
  const [language, setLanguage] = useState("de");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [latexOpen, setLatexOpen] = useState(false);
  const [latexPreview, setLatexPreview] = useState<{
    moduleTex: TexFilePreview;
    definitionTex: TexFilePreview[];
  } | null>(null);
  const [latexError, setLatexError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["module-description", moduleId],
    queryFn: () => getModuleDescriptionPage({ data: { moduleId } }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createModuleDescription({
        data: { moduleId, futureRepo, modulesFilePath, defsFilePath, language },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["module-description", moduleId] });
      void queryClient.invalidateQueries({ queryKey: ["module-descriptions-list"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (moduleDescriptionId: string) =>
      deleteModuleDescription({ data: { moduleDescriptionId } }),
    onSuccess: () => {
      setDeleteOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["module-description", moduleId] });
      void queryClient.invalidateQueries({ queryKey: ["module-descriptions-list"] });
    },
  });

  const resetMutation = useMutation({
    mutationFn: (moduleDescriptionId: string) =>
      resetModuleSemantics({ data: { moduleDescriptionId } }),
    onSuccess: () => {
      setResetOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["module-description", moduleId] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      moduleDescriptionId,
      indexStatus,
    }: {
      moduleDescriptionId: string;
      indexStatus: IndexStatus;
    }) =>
      updateModuleDescriptionIndexStatus({
        data: { moduleDescriptionId, indexStatus },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["module-description", moduleId] });
      void queryClient.invalidateQueries({ queryKey: ["module-descriptions-list"] });
    },
  });

  const latexMutation = useMutation({
    mutationFn: async (
      mod: NonNullable<NonNullable<typeof data>["moduleDescription"]>,
    ) => {
      return generateModuleDescriptionTexPreview({
        moduleId: mod.moduleId,
        language: mod.language,
        titleStatement: mod.titleStatement,
        inhaltStatement: mod.inhaltStatement,
        lernzieleStatement: mod.lernzieleStatement,
        futureRepo: mod.futureRepo,
        modulesFilePath: mod.modulesFilePath,
        definitionBlocks: mod.definitionBlocks,
      });
    },
    onMutate: () => setLatexError(null),
    onSuccess: (result) => {
      setLatexPreview(result);
      setLatexOpen(true);
    },
    onError: (err) => {
      setLatexError(err instanceof Error ? err.message : String(err));
    },
  });

  if (isLoading) {
    return (
      <Group justify="center" p="xl">
        <Loader />
      </Group>
    );
  }

  if (error || !data) {
    return (
      <Alert color="red" title="Failed to load module">
        {(error as Error)?.message ?? "Unknown error"}
      </Alert>
    );
  }

  const title =
    data.catalog?.title ?? data.searchEntry?.title ?? `Module ${moduleId}`;
  const inhalt =
    data.catalog?.descriptionSections?.Inhalt ??
    data.catalog?.descriptionSections?.["Inhalt"] ??
    "";
  const lernziele =
    data.catalog?.descriptionSections?.["Lernziele und Kompetenzen"] ?? "";
  const organizations = data.catalog?.organizations ?? [];
  const programs = data.catalog?.programs ?? [];
  const mod = data.moduleDescription;

  return (
    <Box
      h="100%"
      w="100%"
      style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <Box mb="md" style={{ flexShrink: 0 }}>
        <Group gap="sm" m="xs" align="center" wrap="wrap">
          <Title order={2}>{title}</Title>
          <Badge variant="light">{moduleId}</Badge>
        </Group>

        {mod ? (
          <Group justify="space-between" align="center" wrap="wrap" mt="md" mx="xs">
            <Group gap="sm">
              <Button component={Link} to="/module-descriptions" variant="subtle" size="compact-sm">
                ← Back to search
              </Button>
              <Button variant="light" color="orange" onClick={() => setResetOpen(true)}>
                Reset semantics
              </Button>
              <Button variant="light" color="red" onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
              {canPreviewTex && (
                <Button
                  variant="light"
                  onClick={() => latexMutation.mutate(mod)}
                  loading={latexMutation.isPending}
                >
                  Preview LaTeX
                </Button>
              )}
            </Group>
            {canEditStatus ? (
              <IndexStatusMenu
                status={mod.indexStatus}
                disabled={statusMutation.isPending}
                onStatusChange={(indexStatus: IndexStatus) =>
                  statusMutation.mutate({
                    moduleDescriptionId: mod.id,
                    indexStatus,
                  })
                }
              />
            ) : (
              <Badge
                variant="light"
                color={INDEX_STATUS_CONFIG[mod.indexStatus].color}
              >
                {INDEX_STATUS_CONFIG[mod.indexStatus].label}
              </Badge>
            )}
          </Group>
        ) : (
          <Button
            component={Link}
            to="/module-descriptions"
            variant="subtle"
            size="compact-sm"
            mt="md"
          >
            ← Back to search
          </Button>
        )}

        {mod && latexError && (
          <Alert color="red" title="LaTeX preview failed" mt="md">
            {latexError}
          </Alert>
        )}
      </Box>

      {data.catalogError && (
        <Alert color="yellow" title="Catalog JSON unavailable" mb="md">
          {data.catalogError}
        </Alert>
      )}

      {!mod ? (
        <Stack gap="md" maw={1000} mx="auto" w="100%" style={{ overflow: "auto" }}>
          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="sm">
              Catalog content
            </Title>
            <Stack gap="sm">
              <Box>
                <Text fw={600} size="sm">
                  Inhalt
                </Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {inhalt || "—"}
                </Text>
              </Box>
              <Box>
                <Text fw={600} size="sm">
                  Lernziele und Kompetenzen
                </Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {lernziele || "—"}
                </Text>
              </Box>
            </Stack>
          </Paper>

          {(organizations.length > 0 || programs.length > 0) && (
            <Paper withBorder p="md" radius="md">
              <Title order={4} mb="sm">
                Organization & programs
              </Title>
              {organizations.map((org, i) => (
                <Text key={i} size="sm">
                  {org.faculty} — {org.subjectArea}
                </Text>
              ))}
              {programs.map((prog, i) => (
                <Text key={i} size="sm" c="dimmed">
                  Program {prog.rootUnitId}
                  {prog.ancestorChain?.length
                    ? ` (${prog.ancestorChain.join(" › ")})`
                    : ""}
                </Text>
              ))}
            </Paper>
          )}

          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="sm">
              Export identity
            </Title>
            <Stack gap="sm">
              <TextInput label="futureRepo" value={futureRepo} onChange={(e) => setFutureRepo(e.currentTarget.value)} />
              <TextInput label="modules path" value={modulesFilePath} onChange={(e) => setModulesFilePath(e.currentTarget.value)} />
              <TextInput label="defs path" value={defsFilePath} onChange={(e) => setDefsFilePath(e.currentTarget.value)} />
              <TextInput label="language" value={language} onChange={(e) => setLanguage(e.currentTarget.value)} />
            </Stack>
            <Button
              mt="md"
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!!data.catalogError}
            >
              Create
            </Button>
          </Paper>
        </Stack>
      ) : (
        <Flex
          gap={isTablet ? "md" : "lg"}
          style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
          direction={isTablet ? "column" : "row"}
        >
          <Paper
            flex={isTablet ? undefined : 1}
            shadow="xs"
            withBorder
            radius="md"
            style={{
              minHeight: isTablet ? "50%" : undefined,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              <Box p="md">
                <ModuleStatementsSection
                  moduleId={moduleId}
                  moduleDescriptionId={mod.id}
                  titleStatement={mod.titleStatement}
                  inhaltStatement={mod.inhaltStatement}
                  lernzieleStatement={mod.lernzieleStatement}
                  futureRepo={mod.futureRepo}
                  modulesFilePath={mod.modulesFilePath}
                  defsFilePath={mod.defsFilePath}
                  language={mod.language}
                  definitionBlocks={mod.definitionBlocks}
                />
              </Box>
            </Box>
          </Paper>

          <ModuleDefinitionsSection
            moduleId={moduleId}
            moduleDescriptionId={mod.id}
            definitionBlocks={mod.definitionBlocks}
            canPreviewLatex={canPreviewTex}
          />
        </Flex>
      )}

      <Modal opened={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete module description?">
        <Text size="sm" mb="md">
          This removes all curation for this module and returns to catalog-only view.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            color="red"
            loading={deleteMutation.isPending}
            onClick={() => mod && deleteMutation.mutate(mod.id)}
          >
            Delete
          </Button>
        </Group>
      </Modal>

      <Modal opened={resetOpen} onClose={() => setResetOpen(false)} title="Reset semantics?">
        <Text size="sm" mb="md">
          Re-seed plain text from catalog and remove all definitions and symbolic references.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button
            color="orange"
            loading={resetMutation.isPending}
            onClick={() => mod && resetMutation.mutate(mod.id)}
          >
            Reset
          </Button>
        </Group>
      </Modal>

      {latexPreview && (
        <ModuleDescriptionLatexModal
          opened={latexOpen}
          moduleTex={latexPreview.moduleTex}
          definitionTex={latexPreview.definitionTex}
          onClose={() => setLatexOpen(false)}
        />
      )}
    </Box>
  );
}
