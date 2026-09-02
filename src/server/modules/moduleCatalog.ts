import { readFile } from "node:fs/promises";
import path from "node:path";
import { ParagraphNode } from "@/types/floDown.types";

export type ModuleSearchResult = {
  moduleId: string;
  title: string;
  faculty: string | null;
  subjectArea: string | null;
};

export type ModuleOrganization = {
  faculty: string | null;
  subjectArea: string | null;
};

export type ModuleProgram = {
  rootUnitId: string;
  ancestorChain?: string[];
  category?: string;
};

export type ModuleCatalogJson = {
  moduleId: string;
  elementnr?: string;
  title: string;
  descriptionSections: Record<string, string>;
  metadata?: Record<string, string | string[] | number | boolean | null>;
  organizations?: ModuleOrganization[];
  programs?: ModuleProgram[];
};

type HierarchyModule = {
  moduleId: string;
  elementnr?: string;
  title: string;
  faculty?: string | null;
  subjectArea?: string | null;
  occurrences?: Array<{
    rootUnitId: string;
    ancestorChain?: string[];
  }>;
};

type HierarchyFile = {
  modules: HierarchyModule[];
};

type ModulesIndex = Record<string, string[]>;

let catalogInit: Promise<void> | null = null;
let searchIndex: ModuleSearchResult[] = [];
let modulesIndex: ModulesIndex = {};

const jsonCache = new Map<string, ModuleCatalogJson>();
const JSON_CACHE_MAX = 200;

export function getModulesDir(): string {
  const raw = process.env.MODULES_DIR?.trim() || "modules";
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

async function ensureCatalogLoaded(): Promise<void> {
  if (!catalogInit) {
    catalogInit = loadCatalog();
  }
  await catalogInit;
}

/** Clears the in-memory catalog so tests can point `MODULES_DIR` at a fixture. */
export function resetModuleCatalogForTests(): void {
  catalogInit = null;
  searchIndex = [];
  modulesIndex = {};
  jsonCache.clear();
}

async function loadCatalog(): Promise<void> {
  const modulesDir = getModulesDir();
  const hierarchyPath = path.join(modulesDir, "hierarchy.json");
  const indexPath = path.join(modulesDir, "modules-index.json");

  const [hierarchyRaw, indexRaw] = await Promise.all([
    readFile(hierarchyPath, "utf8"),
    readFile(indexPath, "utf8"),
  ]);

  const hierarchy = JSON.parse(hierarchyRaw) as HierarchyFile;
  modulesIndex = JSON.parse(indexRaw) as ModulesIndex;

  searchIndex = (hierarchy.modules ?? []).map((entry) => ({
    moduleId: entry.moduleId,
    title: entry.title,
    faculty: asOptionalString(entry.faculty),
    subjectArea: asOptionalString(entry.subjectArea),
  }));
}

function compareModuleSearchResults(
  a: ModuleSearchResult,
  b: ModuleSearchResult,
): number {
  return (
    (a.faculty ?? "").localeCompare(b.faculty ?? "") ||
    (a.subjectArea ?? "").localeCompare(b.subjectArea ?? "") ||
    a.title.toLowerCase().localeCompare(b.title.toLowerCase()) ||
    a.moduleId.localeCompare(b.moduleId)
  );
}

// TODO: Convert Markdown in catalog fields to structured FTML (lists, emphasis).
export function markdownToPlainText(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\s*[*•-]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildParagraphStatement(text: string): ParagraphNode {
  return {
    type: "paragraph",
    content: [text],
  };
}

export function seedStatementsFromCatalog(catalog: ModuleCatalogJson) {
  const inhalt =
    catalog.descriptionSections["Inhalt"] ??
    catalog.descriptionSections.Inhalt ??
    "";
  const lernziele =
    catalog.descriptionSections["Lernziele und Kompetenzen"] ?? "";

  return {
    titleStatement: buildParagraphStatement(
      markdownToPlainText(catalog.title ?? ""),
    ),
    inhaltStatement: buildParagraphStatement(markdownToPlainText(inhalt)),
    lernzieleStatement: buildParagraphStatement(
      markdownToPlainText(lernziele),
    ),
  };
}

export async function searchModules(
  query: string,
  limit = 50,
): Promise<ModuleSearchResult[]> {
  await ensureCatalogLoaded();

  const trimmed = query.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const isNumeric = /^\d+$/.test(trimmed);

  const matches = searchIndex.filter((entry) => {
    if (isNumeric) {
      return entry.moduleId.startsWith(trimmed);
    }
    return (
      entry.moduleId.includes(trimmed) ||
      entry.title.toLowerCase().includes(lower)
    );
  });

  return matches.sort(compareModuleSearchResults).slice(0, limit);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

/** Drop null/empty catalog org rows (unclassified modules often store `[null]`). */
export function normalizeOrganizations(raw: unknown): ModuleOrganization[] {
  if (!Array.isArray(raw)) return [];

  const organizations: ModuleOrganization[] = [];
  for (const entry of raw) {
    if (!isPlainObject(entry)) continue;
    const faculty = asOptionalString(entry.faculty);
    const subjectArea = asOptionalString(entry.subjectArea);
    if (!faculty && !subjectArea) continue;
    organizations.push({ faculty, subjectArea });
  }
  return organizations;
}

/** Drop null/incomplete program rows from catalog JSON. */
export function normalizePrograms(raw: unknown): ModuleProgram[] {
  if (!Array.isArray(raw)) return [];

  const programs: ModuleProgram[] = [];
  for (const entry of raw) {
    if (!isPlainObject(entry)) continue;
    const rootUnitId = asOptionalString(entry.rootUnitId);
    if (!rootUnitId) continue;
    programs.push({
      rootUnitId,
      ancestorChain: Array.isArray(entry.ancestorChain)
        ? entry.ancestorChain.filter(
            (part): part is string => typeof part === "string",
          )
        : undefined,
      category:
        typeof entry.category === "string" ? entry.category : undefined,
    });
  }
  return programs;
}

export function normalizeModuleCatalogJson(
  json: ModuleCatalogJson,
): ModuleCatalogJson {
  return {
    ...json,
    organizations: normalizeOrganizations(json.organizations),
    programs: normalizePrograms(json.programs),
  };
}

function cacheJson(moduleId: string, json: ModuleCatalogJson) {
  if (jsonCache.size >= JSON_CACHE_MAX) {
    const firstKey = jsonCache.keys().next().value;
    if (firstKey) jsonCache.delete(firstKey);
  }
  jsonCache.set(moduleId, json);
}

export async function getModuleJson(
  moduleId: string,
): Promise<ModuleCatalogJson> {
  const cached = jsonCache.get(moduleId);
  if (cached) return cached;

  await ensureCatalogLoaded();

  const paths = modulesIndex[moduleId];
  if (!paths?.length) {
    throw new Error(`Module ${moduleId} not found in modules-index.json`);
  }

  const relativePath = paths[0];
  const filePath = path.join(getModulesDir(), relativePath);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    throw new Error(
      `Module JSON file not found for ${moduleId} at ${relativePath}. Check MODULES_DIR.`,
    );
  }

  const json = normalizeModuleCatalogJson(
    JSON.parse(raw) as ModuleCatalogJson,
  );
  cacheJson(moduleId, json);
  return json;
}

export async function getModuleSearchEntry(
  moduleId: string,
): Promise<ModuleSearchResult | null> {
  await ensureCatalogLoaded();
  const entry = searchIndex.find((item) => item.moduleId === moduleId);
  if (!entry) return null;

  try {
    const json = await getModuleJson(moduleId);
    const org = json.organizations?.[0];
    return {
      moduleId: entry.moduleId,
      title: json.title || entry.title,
      faculty: org?.faculty ?? null,
      subjectArea: org?.subjectArea ?? null,
    };
  } catch {
    return entry;
  }
}
