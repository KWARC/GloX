import { FtmlPreview } from "@/components/FtmlPreview";
import { MarkReferenceLatexModal } from "@/components/MarkReferenceLatexModal";
import { ModuleStatementSection } from "@/components/module-descriptions/ModuleStatementSection";
import { generateModuleDescriptionTexPreview } from "@/lib/moduleDescriptionTex";
import {
  deleteModuleDescription,
  getModuleDescriptionPage,
  gloxifyModuleDescription,
  resetModuleSemantics,
} from "@/serverFns/moduleDescription.server";
import { assertFloDownStatement } from "@/types/floDown.types";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
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
  const queryClient = useQueryClient();
  const { data: auth } = useQuery({
    queryKey: ["currentUser"],
    queryFn: currentUser,
  });

  const role = auth?.user?.role;
  const canPreviewTex = role === "ADMIN" || role === "CURATOR";

  const [futureRepo, setFutureRepo] = useState("courses/FAU/module-descriptions");
  const [modulesFilePath, setModulesFilePath] = useState("modules");
  const [defsFilePath, setDefsFilePath] = useState("defs");
  const [language, setLanguage] = useState("de");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [latexOpen, setLatexOpen] = useState(false);
  const [latexCode, setLatexCode] = useState("");
  const [latexFileName, setLatexFileName] = useState("");
  const [latexError, setLatexError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["module-description", moduleId],
    queryFn: () => getModuleDescriptionPage({ data: { moduleId } }),
  });

  const gloxifyMutation = useMutation({
    mutationFn: () =>
      gloxifyModuleDescription({
        data: { moduleId, futureRepo, modulesFilePath, defsFilePath, language },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["module-description", moduleId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (moduleDescriptionId: string) =>
      deleteModuleDescription({ data: { moduleDescriptionId } }),
    onSuccess: () => {
      setDeleteOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["module-description", moduleId] });
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
      setLatexCode(result.moduleTex.tex);
      setLatexFileName(result.moduleTex.fileName);
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
    <Stack p="md" gap="md" maw={1000} mx="auto" w="100%">
      <Group justify="space-between" align="flex-start">
        <Box>
          <Button component={Link} to="/module-descriptions" variant="subtle" size="compact-sm" mb="xs">
            ← Back to search
          </Button>
          <Title order={2}>{title}</Title>
          <Group gap="xs" mt="xs">
            <Badge variant="light">{moduleId}</Badge>
            {mod && <Badge color="green">Gloxified</Badge>}
          </Group>
        </Box>
      </Group>

      {data.catalogError && (
        <Alert color="yellow" title="Catalog JSON unavailable">
          {data.catalogError}
        </Alert>
      )}

      {!mod ? (
        <Stack gap="md">
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
              onClick={() => gloxifyMutation.mutate()}
              loading={gloxifyMutation.isPending}
              disabled={!!data.catalogError}
            >
              Gloxify
            </Button>
          </Paper>
        </Stack>
      ) : (
        <Stack gap="md">
          <Group>
            <Button variant="light" color="orange" onClick={() => setResetOpen(true)}>
              Reset semantics
            </Button>
            <Button variant="light" color="red" onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
            {canPreviewTex && (
              <Button
                variant="light"
                onClick={() => mod && latexMutation.mutate(mod)}
                loading={latexMutation.isPending}
              >
                Preview LaTeX
              </Button>
            )}
          </Group>

          {latexError && (
            <Alert color="red" title="LaTeX preview failed">
              {latexError}
            </Alert>
          )}

          <ModuleStatementSection
            label="Title"
            field="titleStatement"
            moduleDescriptionId={mod.id}
            statement={mod.titleStatement}
            exportIdentity={{
              futureRepo: mod.futureRepo,
              defsFilePath: mod.defsFilePath,
              language: mod.language,
            }}
            editable
            onUpdated={() => void refetch()}
          />
          <ModuleStatementSection
            label="Inhalt"
            field="inhaltStatement"
            moduleDescriptionId={mod.id}
            statement={mod.inhaltStatement}
            exportIdentity={{
              futureRepo: mod.futureRepo,
              defsFilePath: mod.defsFilePath,
              language: mod.language,
            }}
            editable
            onUpdated={() => void refetch()}
          />
          <ModuleStatementSection
            label="Lernziele und Kompetenzen"
            field="lernzieleStatement"
            moduleDescriptionId={mod.id}
            statement={mod.lernzieleStatement}
            exportIdentity={{
              futureRepo: mod.futureRepo,
              defsFilePath: mod.defsFilePath,
              language: mod.language,
            }}
            editable
            onUpdated={() => void refetch()}
          />

          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="sm">
              Definitions
            </Title>
            {mod.definitionBlocks.length === 0 ? (
              <Text size="sm" c="dimmed">
                No definitions yet. Add one via Symbolic Ref → Create new symbol.
              </Text>
            ) : (
              <Stack gap="md">
                {mod.definitionBlocks.map((block) => (
                  <Paper key={block.id} withBorder p="sm" radius="sm">
                    <Group gap="xs" mb="xs">
                      <Badge size="sm">{block.fileName}</Badge>
                      <Badge size="sm" variant="light">
                        {block.declaredSymbols.join(", ") || "no symbols"}
                      </Badge>
                    </Group>
                    <FtmlPreview
                      ftmlAst={assertFloDownStatement(block.statement)}
                      docId={block.id}
                      declaredSymbols={block.declaredSymbols}
                    />
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
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

      <MarkReferenceLatexModal
        opened={latexOpen}
        code={latexCode}
        fileName={latexFileName}
        onClose={() => setLatexOpen(false)}
        onDownload={() => {
          const blob = new Blob([latexCode], { type: "application/x-tex" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = latexFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }}
      />
    </Stack>
  );
}
