/**
 * Load module catalog JSON into 3-field signature records.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  extractSignatureFields,
  isEmptySignature,
} from "./moduleDescriptionDuplicates.mjs";

export function resolveModulesDir(raw) {
  const value = raw?.trim() || process.env.MODULES_DIR?.trim() || "modules";
  return path.isAbsolute(value) ? value : path.resolve(process.cwd(), value);
}

function memberSummary(catalog, relativePath) {
  const org = Array.isArray(catalog.organizations)
    ? catalog.organizations.find(
        (entry) => entry && (entry.faculty || entry.subjectArea),
      )
    : null;
  return {
    moduleId: String(catalog.moduleId ?? ""),
    elementnr:
      typeof catalog.elementnr === "string" ? catalog.elementnr : null,
    path: relativePath,
    faculty: org?.faculty ?? null,
    subjectArea: org?.subjectArea ?? null,
  };
}

export async function loadIndex(modulesDir) {
  const indexPath = path.join(modulesDir, "modules-index.json");
  const raw = await readFile(indexPath, "utf8");
  return JSON.parse(raw);
}

async function readCatalog(filePath) {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function collectModuleRecords(modulesDir, index) {
  const records = [];
  const missingFiles = [];
  const parseErrors = [];
  const pathFieldMismatches = [];
  let emptySignature = 0;

  const entries = Object.entries(index);
  const concurrency = 32;
  let cursor = 0;

  async function worker() {
    while (cursor < entries.length) {
      const indexPos = cursor;
      cursor += 1;
      const [moduleId, paths] = entries[indexPos];
      if (!Array.isArray(paths) || paths.length === 0) {
        missingFiles.push({ moduleId, path: null });
        continue;
      }

      const fieldByPath = [];
      for (const relativePath of paths) {
        const filePath = path.join(modulesDir, relativePath);
        try {
          const catalog = await readCatalog(filePath);
          const fields = extractSignatureFields(catalog);
          fieldByPath.push({ relativePath, fields, catalog });
        } catch (error) {
          const code = error && error.code;
          if (code === "ENOENT") {
            missingFiles.push({ moduleId, path: relativePath });
          } else {
            parseErrors.push({
              moduleId,
              path: relativePath,
              error: String(error?.message ?? error),
            });
          }
        }
      }

      if (fieldByPath.length === 0) continue;

      const primary = fieldByPath[0];
      const primaryPayload = JSON.stringify([
        primary.fields.title,
        primary.fields.inhalt,
        primary.fields.lernziele,
      ]);
      for (const extra of fieldByPath.slice(1)) {
        const extraPayload = JSON.stringify([
          extra.fields.title,
          extra.fields.inhalt,
          extra.fields.lernziele,
        ]);
        if (extraPayload !== primaryPayload) {
          pathFieldMismatches.push({
            moduleId,
            paths: fieldByPath.map((item) => item.relativePath),
          });
          break;
        }
      }

      if (isEmptySignature(primary.fields)) emptySignature += 1;

      records.push({
        ...memberSummary(primary.catalog, primary.relativePath),
        moduleId: String(primary.catalog.moduleId ?? moduleId),
        fields: primary.fields,
      });
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return {
    records,
    missingFiles,
    parseErrors,
    pathFieldMismatches,
    emptySignature,
  };
}
