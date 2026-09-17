/**
 * One-shot: move module-description definitions from defs → defs/{subject-area-slug}.
 *
 *   pnpm migrate:module-defs-path
 *   pnpm migrate:module-defs-path -- --moduleId=71194
 *   pnpm migrate:module-defs-path -- --apply
 *
 * Default dry-run. Requires DATABASE_URL. PDF extracts are not moved.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import {
  MODULE_DEFS_PATH_BASE,
  defaultDefsFilePath,
  getQueryParam,
  parseDeclaredSymbolsInfo,
  replaceDeclarationUrisInInfo,
  replaceOpaqueUrisInValue,
  rewriteUriDefsPath,
} from "./migrate-module-defs-path-uri.mjs";

const { Client } = pg;

function parseArgs(argv) {
  const apply = argv.includes("--apply");
  let moduleId = null;
  for (const arg of argv) {
    if (arg.startsWith("--moduleId=")) {
      moduleId = arg.slice("--moduleId=".length).trim();
    }
  }
  return { apply, moduleId };
}

function resolveModulesDir() {
  const raw = process.env.MODULES_DIR?.trim() || "modules";
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

function collectPlainText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(collectPlainText).join("");
  if (value && typeof value === "object") {
    if ("content" in value) return collectPlainText(value.content);
    return "";
  }
  return "";
}

function titleFromStatement(statement) {
  return collectPlainText(statement).replace(/\s+/g, " ").trim();
}

async function loadHierarchyMeta(modulesDir) {
  const hierarchyPath = path.join(modulesDir, "hierarchy.json");
  const raw = await readFile(hierarchyPath, "utf8");
  const hierarchy = JSON.parse(raw);
  const map = new Map();
  for (const entry of hierarchy.modules ?? []) {
    const id = String(entry.moduleId ?? "");
    if (!id) continue;
    const subjectArea =
      typeof entry.subjectArea === "string" && entry.subjectArea.trim()
        ? entry.subjectArea.trim()
        : null;
    const title =
      typeof entry.title === "string" && entry.title.trim()
        ? entry.title.trim()
        : "";
    map.set(id, { subjectArea, title });
  }
  return map;
}

function inc(stats, key, n = 1) {
  stats[key] = (stats[key] ?? 0) + n;
}

function pushSample(samples, key, value, max = 20) {
  if (!samples[key]) samples[key] = [];
  if (samples[key].length < max) samples[key].push(value);
}

async function main() {
  const { apply, moduleId: filterModuleId } = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const modulesDir = resolveModulesDir();
  const hierarchyMetaByModuleId = await loadHierarchyMeta(modulesDir);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const stats = {};
  const samples = {};
  const blocking = [];

  try {
    const moduleParams = filterModuleId ? [filterModuleId] : [];
    const moduleSql = filterModuleId
      ? `SELECT id, "moduleId", "defsFilePath", "titleStatement" FROM "ModuleDescription" WHERE "moduleId" = $1`
      : `SELECT id, "moduleId", "defsFilePath", "titleStatement" FROM "ModuleDescription"`;
    const { rows: moduleRows } = await client.query(moduleSql, moduleParams);

    if (filterModuleId && moduleRows.length === 0) {
      console.error(
        JSON.stringify({ error: "module_not_found", moduleId: filterModuleId }, null, 2),
      );
      process.exit(1);
    }

    const { rows: defBlocks } = await client.query(`
      SELECT
        id,
        "moduleDescriptionId",
        "futureRepo",
        "filePath",
        "fileName",
        language,
        status,
        "declaredSymbolsInfo",
        statement
      FROM "FloDownBlock"
      WHERE "moduleDescriptionId" IS NOT NULL
        AND "documentId" IS NULL
    `);

    const blocksByModuleDescId = new Map();
    for (const block of defBlocks) {
      const list = blocksByModuleDescId.get(block.moduleDescriptionId) ?? [];
      list.push(block);
      blocksByModuleDescId.set(block.moduleDescriptionId, list);
    }

    /** @type {Map<string, { moduleDescId: string, moduleId: string, title: string, targetPath: string }>} */
    const modulesToMove = new Map();
    const moveModuleDescIds = new Set();

    for (const row of moduleRows) {
      const { id: moduleDescId, moduleId, defsFilePath } = row;
      const meta = hierarchyMetaByModuleId.get(moduleId);
      const title =
        meta?.title || titleFromStatement(row.titleStatement) || moduleId;

      if (defsFilePath !== MODULE_DEFS_PATH_BASE) {
        inc(stats, "skipped_already_not_defs");
        pushSample(samples, "skipped_already_not_defs", moduleId);
        continue;
      }

      if (!meta) {
        inc(stats, "skipped_no_hierarchy");
        pushSample(samples, "skipped_no_hierarchy", moduleId);
        continue;
      }

      const subjectArea = meta.subjectArea;
      if (!subjectArea) {
        inc(stats, "skipped_no_subject_area");
        pushSample(samples, "skipped_no_subject_area", moduleId);
        continue;
      }

      const targetPath = defaultDefsFilePath(subjectArea);
      const blocks = blocksByModuleDescId.get(moduleDescId) ?? [];

      const inconsistent = blocks.some(
        (b) => b.filePath !== MODULE_DEFS_PATH_BASE,
      );
      if (inconsistent) {
        inc(stats, "skipped_inconsistent_block_paths");
        pushSample(samples, "skipped_inconsistent_block_paths", moduleId);
        continue;
      }

      for (const block of blocks) {
        const { rows: atTarget } = await client.query(
          `SELECT status FROM "FloDownBlock"
           WHERE "futureRepo" = $1 AND "filePath" = $2 AND "fileName" = $3 AND language = $4
             AND id != $5`,
          [
            block.futureRepo,
            targetPath,
            block.fileName,
            block.language,
            block.id,
          ],
        );
        if (atTarget.length === 0) continue;
        const sameStatus = atTarget.every((r) => r.status === block.status);
        if (!sameStatus) {
          inc(stats, "skipped_mixed_status_merge");
          pushSample(samples, "skipped_mixed_status_merge", {
            moduleId,
            blockId: block.id,
            fileName: block.fileName,
          });
          modulesToMove.delete(moduleDescId);
          moveModuleDescIds.delete(moduleDescId);
          blocking.push({
            kind: "mixed_status_merge",
            moduleId,
            blockId: block.id,
          });
          continue;
        }
      }

      if (blocking.some((b) => b.moduleId === moduleId && b.kind === "mixed_status_merge")) {
        continue;
      }

      modulesToMove.set(moduleDescId, {
        moduleDescId,
        moduleId,
        title,
        targetPath,
      });
      moveModuleDescIds.add(moduleDescId);
    }

    /** uri -> newUri */
    const replacements = new Map();
    /** uri -> Set(moduleDescId) declaring it */
    const uriDeclarerModules = new Map();

    for (const block of defBlocks) {
      const info = parseDeclaredSymbolsInfo(block.declaredSymbolsInfo);
      for (const decl of info) {
        const set = uriDeclarerModules.get(decl.symbolUri) ?? new Set();
        set.add(block.moduleDescriptionId);
        uriDeclarerModules.set(decl.symbolUri, set);
      }
    }

    for (const { moduleDescId, moduleId, targetPath } of modulesToMove.values()) {
      const blocks = blocksByModuleDescId.get(moduleDescId) ?? [];
      for (const block of blocks) {
        const info = parseDeclaredSymbolsInfo(block.declaredSymbolsInfo);
        for (const decl of info) {
          const oldUri = decl.symbolUri;
          const p = getQueryParam(oldUri, "p");
          if (block.filePath === MODULE_DEFS_PATH_BASE && p !== MODULE_DEFS_PATH_BASE) {
            inc(stats, "skipped_uri_p_mismatch");
            pushSample(samples, "skipped_uri_p_mismatch", {
              moduleId,
              blockId: block.id,
              p,
            });
            modulesToMove.delete(moduleDescId);
            moveModuleDescIds.delete(moduleDescId);
            break;
          }

          const newUri = rewriteUriDefsPath(oldUri, targetPath);
          if (!newUri) {
            inc(stats, "skipped_uri_p_mismatch");
            pushSample(samples, "skipped_uri_p_mismatch", {
              moduleId,
              blockId: block.id,
              reason: "rewrite_failed",
            });
            modulesToMove.delete(moduleDescId);
            moveModuleDescIds.delete(moduleDescId);
            break;
          }

          if (replacements.has(oldUri) && replacements.get(oldUri) !== newUri) {
            blocking.push({
              kind: "uri_split_conflict",
              oldUri,
              existing: replacements.get(oldUri),
              attempted: newUri,
              moduleId,
            });
            inc(stats, "uri_split_conflict");
            pushSample(samples, "uri_split_conflict", {
              oldUri,
              moduleId,
            });
          } else {
            replacements.set(oldUri, newUri);
          }
        }
        if (!modulesToMove.has(moduleDescId)) break;
      }
    }

    if (filterModuleId) {
      for (const [oldUri] of replacements) {
        const declarers = uriDeclarerModules.get(oldUri) ?? new Set();
        for (const descId of declarers) {
          if (!moveModuleDescIds.has(descId)) {
            blocking.push({
              kind: "shared_uri_with_other_module",
              oldUri,
              otherModuleDescriptionId: descId,
            });
            inc(stats, "shared_uri_with_other_module");
            pushSample(samples, "shared_uri_with_other_module", { oldUri });
          }
        }
      }
    }

    const uniqueBlocking = blocking.filter(
      (item, index, arr) =>
        arr.findIndex(
          (x) => x.kind === item.kind && JSON.stringify(x) === JSON.stringify(item),
        ) === index,
    );

    let blocksToMove = 0;
    for (const moduleDescId of moveModuleDescIds) {
      blocksToMove += (blocksByModuleDescId.get(moduleDescId) ?? []).length;
    }

    const wouldUpdate = [...modulesToMove.values()]
      .filter((m) => moveModuleDescIds.has(m.moduleDescId))
      .map((m) => ({
        id: m.moduleDescId,
        moduleId: m.moduleId,
        title: m.title,
        targetPath: m.targetPath,
      }))
      .sort((a, b) => a.moduleId.localeCompare(b.moduleId));

    const report = {
      mode: apply ? "apply" : "dry-run",
      scopedModuleId: filterModuleId ?? null,
      modulesDir,
      wouldMoveModules: wouldUpdate.length,
      wouldMoveBlocks: blocksToMove,
      uriReplacementCount: replacements.size,
      wouldUpdate,
      skipStats: stats,
      samples,
      blocking: uniqueBlocking,
    };

    console.log(JSON.stringify(report, null, 2));

    if (uniqueBlocking.length > 0) {
      console.error("\nBlocking issues — fix before --apply.");
      process.exit(1);
    }

    if (moveModuleDescIds.size === 0) {
      console.error("\nNothing to move.");
      return;
    }

    if (!apply) {
      console.error("\nDry run only. Re-run with --apply to write.");
      return;
    }

    await client.query("BEGIN");
    try {
      for (const { moduleDescId, targetPath } of modulesToMove.values()) {
        await client.query(
          `UPDATE "ModuleDescription" SET "defsFilePath" = $2 WHERE id = $1`,
          [moduleDescId, targetPath],
        );
      }

      for (const moduleDescId of moveModuleDescIds) {
        await client.query(
          `UPDATE "FloDownBlock"
           SET "filePath" = (
             SELECT "defsFilePath" FROM "ModuleDescription" WHERE id = $1
           )
           WHERE "moduleDescriptionId" = $1
             AND "documentId" IS NULL
             AND "filePath" = $2`,
          [moduleDescId, MODULE_DEFS_PATH_BASE],
        );
      }

      const { rows: allBlocks } = await client.query(`
        SELECT id, statement, "declaredSymbolsInfo"
        FROM "FloDownBlock"
      `);
      for (const row of allBlocks) {
        const info = replaceDeclarationUrisInInfo(
          parseDeclaredSymbolsInfo(row.declaredSymbolsInfo),
          replacements,
        );
        const statement = replaceOpaqueUrisInValue(row.statement, replacements);
        await client.query(
          `UPDATE "FloDownBlock"
           SET statement = $2::jsonb, "declaredSymbolsInfo" = $3::jsonb
           WHERE id = $1`,
          [row.id, JSON.stringify(statement), JSON.stringify(info)],
        );
      }

      const { rows: allModules } = await client.query(`
        SELECT id, "titleStatement", "inhaltStatement", "lernzieleStatement"
        FROM "ModuleDescription"
      `);
      for (const row of allModules) {
        await client.query(
          `UPDATE "ModuleDescription"
           SET "titleStatement" = $2::jsonb,
               "inhaltStatement" = $3::jsonb,
               "lernzieleStatement" = $4::jsonb
           WHERE id = $1`,
          [
            row.id,
            JSON.stringify(
              replaceOpaqueUrisInValue(row.titleStatement, replacements),
            ),
            JSON.stringify(
              replaceOpaqueUrisInValue(row.inhaltStatement, replacements),
            ),
            JSON.stringify(
              replaceOpaqueUrisInValue(row.lernzieleStatement, replacements),
            ),
          ],
        );
      }

      await client.query("COMMIT");
      console.log(
        JSON.stringify(
          {
            applied: true,
            movedModules: moveModuleDescIds.size,
            movedBlocks: blocksToMove,
            uriReplacements: replacements.size,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
