import { IndexStatusMenu } from "@/components/IndexStatusMenu";
import {
  MarkedDuplicateOf,
  ModuleDuplicateHint,
  PotentialDuplicateTargets,
} from "@/components/module-descriptions/ModuleDuplicateHint";
import { ModuleDefinitionsSection } from "@/components/module-descriptions/ModuleDefinitionsSection";
import { ModuleDescriptionLatexModal } from "@/components/module-descriptions/ModuleDescriptionLatexModal";
import { ModuleStatementsSection } from "@/components/module-descriptions/ModuleStatementsSection";
import { eligibleMarkTargetIds, pickMarkCanonicalId } from "@/lib/moduleDuplicateHintDisplay";
import {
  composeModuleTexInputForExport,
  generateModuleDescriptionTexPreview,
  type TexFilePreview,
} from "@/lib/moduleDescriptionTex";
import {
  createModuleDescription,
  deleteModuleDescription,
  getModuleDescriptionPage,
  markModuleDescriptionDuplicate,
  resetModuleSemantics,
  unmarkModuleDescriptionDuplicate,
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
import { useEffect, useState } from "react";

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
  const canEditExportIdentityPaths = role === "ADMIN" || role === "CURATOR";

  const [futureRepo, setFutureRepo] = useState("courses/FAU/module-descriptions");
  const [modulesFilePath, setModulesFilePath] = useState("modules");
  const [defsFilePath, setDefsFilePath] = useState("defs");
  const [language, setLanguage] = useState("de");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);
  const [canonicalModuleId, setCanonicalModuleId] = useState("");
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

  const markMutation = useMutation({
    mutationFn: (canonicalId: string) =>
      markModuleDescriptionDuplicate({
        data: {
          moduleId,
          canonicalModuleId: canonicalId,
          futureRepo,
          modulesFilePath,
          defsFilePath,
          language,
        },
      }),
    onSuccess: () => {
      setMarkOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["module-description", moduleId] });
      void queryClient.invalidateQueries({ queryKey: ["module-descriptions-list"] });
      void queryClient.invalidateQueries({ queryKey: ["module-descriptions-search"] });
    },
  });

  const unmarkMutation = useMutation({
    mutationFn: (moduleDescriptionId: string) =>
      unmarkModuleDescriptionDuplicate({ data: { moduleDescriptionId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["module-description", moduleId] });
      void queryClient.invalidateQueries({ queryKey: ["module-descriptions-list"] });
      void queryClient.invalidateQueries({ queryKey: ["module-descriptions-search"] });
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
      return generateModuleDescriptionTexPreview(
        composeModuleTexInputForExport(
          {
            moduleId: mod.moduleId,
            language: mod.language,
            titleStatement: mod.titleStatement,
            inhaltStatement: mod.inhaltStatement,
            lernzieleStatement: mod.lernzieleStatement,
            futureRepo: mod.futureRepo,
            modulesFilePath: mod.modulesFilePath,
            definitionBlocks: mod.definitionBlocks,
            duplicateOfModuleId: mod.duplicateOfModuleId,
          },
          data?.canonical
            ? {
                inhaltStatement: data.canonical.inhaltStatement,
                lernzieleStatement: data.canonical.lernzieleStatement,
              }
            : null,
        ),
      );
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

  useEffect(() => {
    const hint = data?.duplicateHint;
    if (!hint) return;
    const eligible = eligibleMarkTargetIds(hint.exact, hint.near);
    const suggested = pickMarkCanonicalId(eligible.exact, eligible.near);
    if (suggested) {
      setCanonicalModuleId((current) => current || suggested);
    }
  }, [data?.duplicateHint]);

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
  const isDuplicate = Boolean(mod?.duplicateOfModuleId);
  const markTargets = eligibleMarkTargetIds(
    data.duplicateHint?.exact ?? [],
    data.duplicateHint?.near ?? [],
  );

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
              {isDuplicate ? (
                <Button
                  variant="light"
                  loading={unmarkMutation.isPending}
                  onClick={() => unmarkMutation.mutate(mod.id)}
                >
                  Unmark duplicate
                </Button>
              ) : (
                <Button variant="light" onClick={() => setMarkOpen(true)}>
                  Mark as duplicate
                </Button>
              )}
              <Button
                variant="light"
                color="orange"
                disabled={isDuplicate}
                onClick={() => setResetOpen(true)}
              >
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
          <Group gap="sm" mt="md" mx="xs">
            <Button
              component={Link}
              to="/module-descriptions"
              variant="subtle"
              size="compact-sm"
            >
              ← Back to search
            </Button>
            <Button variant="light" onClick={() => setMarkOpen(true)}>
              Mark as duplicate
            </Button>
          </Group>
        )}

        {mod && latexError && (
          <Alert color="red" title="LaTeX preview failed" mt="md">
            {latexError}
          </Alert>
        )}

        {isDuplicate && mod?.duplicateOfModuleId && (
          <Box mt="md" mx="xs">
            <MarkedDuplicateOf moduleId={mod.duplicateOfModuleId} />
          </Box>
        )}

        {data.duplicateHint && !isDuplicate && (
          <Box mt="sm" mx="xs">
            <ModuleDuplicateHint
              exact={data.duplicateHint.exact}
              near={data.duplicateHint.near}
            />
          </Box>
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
              {organizations.map((org, i) => {
                const label = [org?.faculty, org?.subjectArea]
                  .filter(Boolean)
                  .join(" — ");
                if (!label) return null;
                return (
                  <Text key={i} size="sm">
                    {label}
                  </Text>
                );
              })}
              {programs.map((prog, i) => {
                if (!prog?.rootUnitId) return null;
                return (
                  <Text key={i} size="sm" c="dimmed">
                    Program {prog.rootUnitId}
                    {prog.ancestorChain?.length
                      ? ` (${prog.ancestorChain.join(" › ")})`
                      : ""}
                  </Text>
                );
              })}
            </Paper>
          )}

          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="sm">
              Export identity
            </Title>
            <Stack gap="sm">
              {canEditExportIdentityPaths && (
                <>
                  <TextInput label="futureRepo" value={futureRepo} onChange={(e) => setFutureRepo(e.currentTarget.value)} />
                  <TextInput label="modules path" value={modulesFilePath} onChange={(e) => setModulesFilePath(e.currentTarget.value)} />
                  <TextInput label="defs path" value={defsFilePath} onChange={(e) => setDefsFilePath(e.currentTarget.value)} />
                </>
              )}
              <TextInput label="language (de/en)" value={language} onChange={(e) => setLanguage(e.currentTarget.value)} />
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
      ) : isDuplicate ? null : (
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

      <Modal opened={markOpen} onClose={() => setMarkOpen(false)} title="Mark as duplicate?">
        {mod ? (
          <Text size="sm" mb="md">
            Extracted Inhalt, Lernziele, definitions, and related glossary blocks on
            this module will be permanently removed.
          </Text>
        ) : null}
        <PotentialDuplicateTargets
          exactIds={markTargets.exact}
          nearIds={markTargets.near}
          onSelect={setCanonicalModuleId}
        />
        <TextInput
          label="Canonical module ID"
          placeholder="e.g. 42438"
          value={canonicalModuleId}
          onChange={(e) => setCanonicalModuleId(e.currentTarget.value)}
          mb="md"
        />
        {markMutation.isError && (
          <Alert color="red" mb="md">
            {(markMutation.error as Error).message}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setMarkOpen(false)}>
            Cancel
          </Button>
          <Button
            color="orange"
            loading={markMutation.isPending}
            disabled={!canonicalModuleId.trim()}
            onClick={() => markMutation.mutate(canonicalModuleId.trim())}
          >
            Mark as duplicate
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
