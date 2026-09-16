#!/usr/bin/env node

/**
 * Marks hierarchy.json modules whose moduleId is absent from modules-index.json
 * with `"missing": true`. Clears the flag when the ID is present again.
 *
 * Usage:
 *   pnpm sync:hierarchy-missing           # dry run
 *   pnpm sync:hierarchy-missing -- --apply
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = new Set(process.argv.slice(2).filter((arg) => arg !== "--"));
const apply = args.has("--apply");
const validArgs = new Set(["--apply"]);

if ([...args].some((arg) => !validArgs.has(arg))) {
  console.error(
    "Usage: node scripts/mark-hierarchy-missing-modules.mjs [--apply]",
  );
  process.exit(2);
}

const projectRoot = path.resolve(import.meta.dirname, "..");
const modulesDirectory = path.join(projectRoot, "modules");
const hierarchyPath = path.join(modulesDirectory, "hierarchy.json");
const indexPath = path.join(modulesDirectory, "modules-index.json");

function withMissingFlag(module, isMissing) {
  const updated = {};
  for (const [key, value] of Object.entries(module)) {
    if (key === "missing") continue;
    updated[key] = value;
    if (key === "moduleId" && isMissing) updated.missing = true;
  }
  if (isMissing && !("missing" in updated)) updated.missing = true;
  return updated;
}

function isFlaggedMissing(module) {
  return module.missing === true;
}

function sameModule(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const modulesIndex = JSON.parse(await readFile(indexPath, "utf8"));
const indexedIds = new Set(Object.keys(modulesIndex));

const hierarchy = JSON.parse(await readFile(hierarchyPath, "utf8"));
if (!Array.isArray(hierarchy.modules)) {
  throw new Error("modules/hierarchy.json must contain a modules array");
}

const markedIds = [];
const clearedIds = [];
let pendingUpdates = 0;
let updated = 0;

for (let index = 0; index < hierarchy.modules.length; index += 1) {
  const module = hierarchy.modules[index];
  const moduleId = String(module.moduleId);
  const isMissing = !indexedIds.has(moduleId);
  const next = withMissingFlag(module, isMissing);
  if (sameModule(module, next)) continue;

  pendingUpdates += 1;
  if (isMissing && !isFlaggedMissing(module)) markedIds.push(moduleId);
  else if (!isMissing && "missing" in module) clearedIds.push(moduleId);

  if (apply) {
    hierarchy.modules[index] = next;
    updated += 1;
  }
}

if (apply && updated) {
  await writeFile(hierarchyPath, `${JSON.stringify(hierarchy, null, 2)}\n`);
}

function reportIds(label, ids) {
  if (!ids.length) return;
  const detail = ids.slice(0, 20).join(", ");
  console.log(`${label} (${ids.length}): ${detail}${ids.length <= 20 ? "" : ", …"}`);
}

const mode = apply ? "Applied" : "Dry run";
console.log(`${mode} for ${hierarchy.modules.length} hierarchy modules.`);
console.log(`Indexed module IDs: ${indexedIds.size}.`);
if (apply) console.log(`Updated ${updated} hierarchy entries.`);
else console.log(`Would update ${pendingUpdates} hierarchy entries.`);
reportIds("Would mark missing", apply ? [] : markedIds);
reportIds("Marked missing", apply ? markedIds : []);
reportIds("Would clear missing", apply ? [] : clearedIds);
reportIds("Cleared missing", apply ? clearedIds : []);
