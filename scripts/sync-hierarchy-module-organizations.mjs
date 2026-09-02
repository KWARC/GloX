#!/usr/bin/env node

/**
 * Copies faculty and subjectArea from the canonical module JSON into each
 * matching entry in modules/hierarchy.json.
 *
 * The first path in modules-index.json is the canonical source. This mirrors
 * getModuleJson(), which uses the same precedence when a module ID exists in
 * more than one source file. Values come from the first usable
 * `organizations` row in that file, not from the directory names (those
 * sometimes replace `:` / `/` with `-`).
 *
 * Usage:
 *   pnpm check:module-organizations          # verify; exit 1 on mismatches
 *   pnpm sync:module-organizations           # dry run
 *   pnpm sync:module-organizations -- --apply
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const check = args.has("--check");
const strict = args.has("--strict");
const verbose = args.has("--verbose");
const validArgs = new Set(["--apply", "--check", "--strict", "--verbose"]);

if ([...args].some((arg) => !validArgs.has(arg)) || (apply && check)) {
  console.error(
    "Usage: node scripts/sync-hierarchy-module-organizations.mjs [--check | --apply] [--strict] [--verbose]",
  );
  process.exit(2);
}

const projectRoot = path.resolve(import.meta.dirname, "..");
const modulesDirectory = path.join(projectRoot, "modules");
const hierarchyPath = path.join(modulesDirectory, "hierarchy.json");
const indexPath = path.join(modulesDirectory, "modules-index.json");

function asOptionalString(value) {
  return typeof value === "string" && value.trim() ? value : null;
}

function firstOrganization(raw) {
  if (!Array.isArray(raw)) return null;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const faculty = asOptionalString(entry.faculty);
    const subjectArea = asOptionalString(entry.subjectArea);
    if (!faculty || !subjectArea) continue;
    return { faculty, subjectArea };
  }
  return null;
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
  const detail = verbose ? ids.join(", ") : ids.slice(0, 20).join(", ");
  console[method](`${label} (${ids.length}): ${detail}${verbose || ids.length <= 20 ? "" : ", …"}`);
}

const modulesIndex = JSON.parse(await readFile(indexPath, "utf8"));
const sourceByModuleId = new Map();
const sourceProblems = [];
const sourceIdsWithoutOrganization = new Set();

for (const [moduleId, paths] of Object.entries(modulesIndex)) {
  const relativePath = Array.isArray(paths) ? paths[0] : undefined;
  if (typeof relativePath !== "string") {
    sourceProblems.push(`${moduleId}: no canonical path in modules-index.json`);
    continue;
  }

  try {
    const json = JSON.parse(await readFile(path.join(modulesDirectory, relativePath), "utf8"));
    const organization = firstOrganization(json.organizations);
    if (!organization) {
      sourceIdsWithoutOrganization.add(moduleId);
      continue;
    }
    sourceByModuleId.set(moduleId, organization);
  } catch (error) {
    sourceProblems.push(`${relativePath}: ${error.message}`);
  }
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

const mode = apply ? "Applied" : check ? "Checked" : "Dry run";
console.log(`${mode} for ${hierarchy.modules.length} hierarchy modules.`);
console.log(`Canonical organization data found for ${sourceByModuleId.size} module IDs.`);
if (apply) console.log(`Updated ${updated} hierarchy entries.`);
else console.log(`Would update ${pendingUpdates} hierarchy entries.`);
reportIds("Organization mismatches", mismatches, "error");
reportIds("No matching source JSON", missingSources);
reportIds("Source JSON without organization data", sourcesWithoutOrganization);
if (sourceProblems.length) console.error(`Source problems (${sourceProblems.length}):\n${sourceProblems.join("\n")}`);

if (
  sourceProblems.length ||
  ((apply || check) && mismatches.length) ||
  (strict && (missingSources.length || sourcesWithoutOrganization.length))
) {
  process.exitCode = 1;
}
