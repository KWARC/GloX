#!/usr/bin/env node

/**
 * Copies faculty and subjectArea from the indexed module file path into each
 * matching entry in modules/hierarchy.json.
 *
 * Every relative path in modules-index.json is considered. The first path
 * that yields an organization is selected; unclassified paths are skipped.
 * Values come from the path only:
 * modules/<faculty>/<subjectArea>/<moduleId>.json.
 *
 * Usage:
 *   pnpm sync:module-organizations           # dry run
 *   pnpm sync:module-organizations -- --apply
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const validArgs = new Set(["--apply"]);

if ([...args].some((arg) => !validArgs.has(arg))) {
  console.error(
    "Usage: node scripts/sync-hierarchy-module-organizations.mjs [--apply]",
  );
  process.exit(2);
}

const projectRoot = path.resolve(import.meta.dirname, "..");
const modulesDirectory = path.join(projectRoot, "modules");
const moduleFilesDirectory = path.join(modulesDirectory, "modules");
const hierarchyPath = path.join(modulesDirectory, "hierarchy.json");
const indexPath = path.join(modulesDirectory, "modules-index.json");

function organizationFromFilePath(relativePath, moduleId) {
  const filePath = path.resolve(modulesDirectory, relativePath);
  const relativeToModuleFiles = path.relative(moduleFilesDirectory, filePath);
  const parentDirectory = path.dirname(filePath);
  const parentName = path.basename(parentDirectory);

  if (
    relativeToModuleFiles.startsWith("..") ||
    path.isAbsolute(relativeToModuleFiles) ||
    path.basename(filePath) !== `${moduleId}.json`
  ) {
    throw new Error("path must identify that module's JSON file below modules/modules");
  }

  // Single-directory paths: modules/lehramt/<id>.json and
  // modules/unclassified/<id>.json.
  if (path.dirname(parentDirectory) === moduleFilesDirectory) {
    if (parentName === "unclassified") return null;
    if (parentName !== "lehramt") {
      throw new Error("single-directory path must be lehramt or unclassified");
    }
    return { faculty: "Lehramt", subjectArea: "Lehramt" };
  }

  const facultyDirectory = path.dirname(parentDirectory);
  if (path.dirname(facultyDirectory) !== moduleFilesDirectory) {
    throw new Error("path must contain exactly faculty and subject-area directories");
  }
  return {
    faculty: path.basename(facultyDirectory),
    subjectArea: parentName,
  };
}

function sameOrganization(module, expected) {
  return (
    module.faculty === expected.faculty &&
    module.subjectArea === expected.subjectArea &&
    !("organizations" in module)
  );
}

function organizationAfterTitle(module, organization) {
  const updated = {};
  for (const [key, value] of Object.entries(module)) {
    if (key === "faculty" || key === "subjectArea" || key === "organizations") continue;
    updated[key] = value;
    if (key === "title") {
      updated.faculty = organization.faculty;
      updated.subjectArea = organization.subjectArea;
    }
  }
  if (!("faculty" in updated)) {
    updated.faculty = organization.faculty;
    updated.subjectArea = organization.subjectArea;
  }
  return updated;
}

function hasOrganizationAfterTitle(module) {
  const keys = Object.keys(module);
  const titleIndex = keys.indexOf("title");
  return (
    titleIndex >= 0 &&
    keys[titleIndex + 1] === "faculty" &&
    keys[titleIndex + 2] === "subjectArea"
  );
}

function needsUpdate(module, expected) {
  return !sameOrganization(module, expected) || !hasOrganizationAfterTitle(module);
}

function reportIds(label, ids, method = "warn") {
  if (!ids.length) return;
  const detail = ids.slice(0, 20).join(", ");
  console[method](`${label} (${ids.length}): ${detail}${ids.length <= 20 ? "" : ", …"}`);
}

const modulesIndex = JSON.parse(await readFile(indexPath, "utf8"));
const sourceByModuleId = new Map();
const sourceProblems = [];
const sourceIdsWithoutOrganization = new Set();

for (const [moduleId, paths] of Object.entries(modulesIndex)) {
  if (!Array.isArray(paths) || paths.length === 0) {
    sourceProblems.push(`${moduleId}: no paths in modules-index.json`);
    continue;
  }

  let organization;
  let hasUnclassifiedPath = false;

  for (const relativePath of paths) {
    if (typeof relativePath !== "string") {
      sourceProblems.push(`${moduleId}: path is not a string`);
      continue;
    }

    try {
      const candidate = organizationFromFilePath(relativePath, moduleId);
      if (!candidate) {
        hasUnclassifiedPath = true;
        continue;
      }
      organization ??= candidate;
    } catch (error) {
      sourceProblems.push(`${relativePath}: ${error.message}`);
    }
  }

  if (organization) sourceByModuleId.set(moduleId, organization);
  else if (hasUnclassifiedPath) sourceIdsWithoutOrganization.add(moduleId);
}

const hierarchy = JSON.parse(await readFile(hierarchyPath, "utf8"));
if (!Array.isArray(hierarchy.modules)) {
  throw new Error("modules/hierarchy.json must contain a modules array");
}

const missingSources = [];
const sourcesWithoutOrganization = [];
let updated = 0;
let pendingUpdates = 0;

for (let index = 0; index < hierarchy.modules.length; index += 1) {
  const module = hierarchy.modules[index];
  const moduleId = String(module.moduleId);
  const expected = sourceByModuleId.get(moduleId);
  if (!expected) {
    (sourceIdsWithoutOrganization.has(moduleId)
      ? sourcesWithoutOrganization
      : missingSources
    ).push(moduleId);
    // Path has no faculty/subjectArea — strip any leftover flat fields.
    const hasFlatOrg =
      "faculty" in module || "subjectArea" in module || "organizations" in module;
    if (hasFlatOrg) {
      pendingUpdates += 1;
      if (apply) {
        const cleared = { ...module };
        delete cleared.faculty;
        delete cleared.subjectArea;
        delete cleared.organizations;
        hierarchy.modules[index] = cleared;
        updated += 1;
      }
    }
    continue;
  }

  if (!needsUpdate(module, expected)) continue;
  pendingUpdates += 1;
  if (apply) {
    hierarchy.modules[index] = organizationAfterTitle(module, expected);
    updated += 1;
  }
}

if (apply && updated) {
  await writeFile(hierarchyPath, `${JSON.stringify(hierarchy, null, 2)}\n`);
}

const hierarchyForVerification = apply
  ? JSON.parse(await readFile(hierarchyPath, "utf8"))
  : hierarchy;
const mismatches = hierarchyForVerification.modules
  .filter((module) => {
    const expected = sourceByModuleId.get(String(module.moduleId));
    return expected && needsUpdate(module, expected);
  })
  .map((module) => String(module.moduleId));

const mode = apply ? "Applied" : "Dry run";
console.log(`${mode} for ${hierarchy.modules.length} hierarchy modules.`);
console.log(`Canonical organization data found for ${sourceByModuleId.size} module IDs.`);
if (apply) console.log(`Updated ${updated} hierarchy entries.`);
else console.log(`Would update ${pendingUpdates} hierarchy entries.`);
reportIds("Organization mismatches", mismatches, "error");
reportIds("No matching source JSON", missingSources);
reportIds("Source path without organization data", sourcesWithoutOrganization);
if (sourceProblems.length) console.error(`Source problems (${sourceProblems.length}):\n${sourceProblems.join("\n")}`);

if (
  sourceProblems.length ||
  (apply && mismatches.length)
) {
  process.exitCode = 1;
}
