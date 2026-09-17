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

function countExactString(value, target) {
  if (typeof value === "string") return value === target ? 1 : 0;
  if (Array.isArray(value)) {
    return value.reduce((n, item) => n + countExactString(item, target), 0);
  }
  if (value && typeof value === "object") {
    return Object.values(value).reduce(
      (n, child) => n + countExactString(child, target),
      0,
    );
  }
  return 0;
}

function moduleSummary(row, hierarchyMetaByModuleId) {
  const meta = hierarchyMetaByModuleId.get(row.moduleId);
  return {
    id: row.id,
    moduleId: row.moduleId,
    title: meta?.title || titleFromStatement(row.titleStatement) || row.moduleId,
    defsFilePath: row.defsFilePath,
  };
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
    const { rows: allModuleRows } = await client.query(`
      SELECT id, "moduleId", "defsFilePath", "titleStatement"
      FROM "ModuleDescription"
    `);
    const moduleByDescId = new Map();
    for (const row of allModuleRows) {
      moduleByDescId.set(row.id, moduleSummary(row, hierarchyMetaByModuleId));
    }

    const moduleRows = filterModuleId
      ? allModuleRows.filter((row) => row.moduleId === filterModuleId)
      : allModuleRows;

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

    /** @type {Map<string, Map<string, object[]>>} oldUri -> newUri -> claims */
    const uriClaims = new Map();

    function addUriClaim(oldUri, newUri, claim) {
      let byNew = uriClaims.get(oldUri);
      if (!byNew) {
        byNew = new Map();
        uriClaims.set(oldUri, byNew);
      }
      const list = byNew.get(newUri) ?? [];
      list.push(claim);
      byNew.set(newUri, list);
    }

    function declarationSite(block, decl) {
      const owner = moduleByDescId.get(block.moduleDescriptionId);
      const planned = modulesToMove.get(block.moduleDescriptionId);
      return {
        moduleDescriptionId: block.moduleDescriptionId,
        moduleId: owner?.moduleId ?? null,
        title: owner?.title ?? null,
        defsFilePath: owner?.defsFilePath ?? null,
        inThisRun: moveModuleDescIds.has(block.moduleDescriptionId),
        plannedTargetPath: planned?.targetPath ?? null,
        blockId: block.id,
        fileName: block.fileName,
        filePath: block.filePath,
        language: block.language,
        status: block.status,
        symbolName: decl.symbolName,
      };
    }

    for (const { moduleDescId, moduleId, title, targetPath } of modulesToMove.values()) {
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

          addUriClaim(oldUri, newUri, {
            moduleDescriptionId: moduleDescId,
            moduleId,
            title,
            currentDefsFilePath: MODULE_DEFS_PATH_BASE,
            plannedTargetPath: targetPath,
            blockId: block.id,
            fileName: block.fileName,
            filePath: block.filePath,
            language: block.language,
            symbolName: decl.symbolName,
          });
        }
        if (!modulesToMove.has(moduleDescId)) break;
      }
    }

    const replacements = new Map();
    const splitOldUris = [];
    for (const [oldUri, byNew] of uriClaims) {
      if (byNew.size === 1) {
        replacements.set(oldUri, [...byNew.keys()][0]);
        continue;
      }
      splitOldUris.push(oldUri);
      inc(stats, "uri_split_conflict");
      pushSample(samples, "uri_split_conflict", oldUri);
    }

    async function collectUriUsages(oldUri) {
      const declaredOn = [];
      for (const block of defBlocks) {
        for (const decl of parseDeclaredSymbolsInfo(block.declaredSymbolsInfo)) {
          if (decl.symbolUri === oldUri) {
            declaredOn.push(declarationSite(block, decl));
          }
        }
      }
      declaredOn.sort((a, b) => String(a.moduleId).localeCompare(String(b.moduleId)));

      const { rows: allBlocks } = await client.query(`
        SELECT
          id,
          "moduleDescriptionId",
          "documentId",
          "fileName",
          "filePath",
          language,
          statement,
          "declaredSymbolsInfo"
        FROM "FloDownBlock"
      `);
      const referencedFrom = [];
      for (const row of allBlocks) {
        const inStatement = countExactString(row.statement, oldUri);
        const inInfo = countExactString(row.declaredSymbolsInfo, oldUri);
        if (inStatement === 0 && inInfo === 0) continue;
        const owner = row.moduleDescriptionId
          ? moduleByDescId.get(row.moduleDescriptionId)
          : null;
        referencedFrom.push({
          kind: row.documentId ? "pdf_or_document_block" : "module_definition_block",
          blockId: row.id,
          documentId: row.documentId,
          moduleDescriptionId: row.moduleDescriptionId,
          moduleId: owner?.moduleId ?? null,
          title: owner?.title ?? null,
          fileName: row.fileName,
          filePath: row.filePath,
          language: row.language,
          hitsInStatement: inStatement,
          hitsInDeclaredSymbolsInfo: inInfo,
        });
      }

      const { rows: statementRows } = await client.query(`
        SELECT id, "moduleId", "titleStatement", "inhaltStatement", "lernzieleStatement"
        FROM "ModuleDescription"
      `);
      const moduleStatementRefs = [];
      for (const row of statementRows) {
        const titleHits = countExactString(row.titleStatement, oldUri);
        const inhaltHits = countExactString(row.inhaltStatement, oldUri);
        const lernHits = countExactString(row.lernzieleStatement, oldUri);
        if (titleHits + inhaltHits + lernHits === 0) continue;
        const owner = moduleByDescId.get(row.id);
        moduleStatementRefs.push({
          moduleDescriptionId: row.id,
          moduleId: row.moduleId,
          title: owner?.title ?? null,
          hits: {
            titleStatement: titleHits,
            inhaltStatement: inhaltHits,
            lernzieleStatement: lernHits,
          },
        });
      }

      return { declaredOn, referencedFrom, moduleStatementRefs };
    }

    for (const oldUri of splitOldUris) {
      const byNew = uriClaims.get(oldUri);
      const usages = await collectUriUsages(oldUri);
      const competingTargets = [...byNew.entries()]
        .map(([newUri, claims]) => ({
          newUri,
          plannedTargetPath: claims[0]?.plannedTargetPath ?? getQueryParam(newUri, "p"),
          modules: claims,
        }))
        .sort((a, b) =>
          String(a.plannedTargetPath).localeCompare(String(b.plannedTargetPath)),
        );

      blocking.push({
        kind: "uri_split_conflict",
        why: "The same declared symbol URI would move to more than one defs/{subjectArea} path. Opaque replace can only map one old string to one new string.",
        oldUri,
        currentPath: getQueryParam(oldUri, "p"),
        fileName: getQueryParam(oldUri, "m"),
        symbol: getQueryParam(oldUri, "s"),
        competingTargets,
        declaredOn: usages.declaredOn,
        referencedFrom: usages.referencedFrom,
        moduleStatementRefs: usages.moduleStatementRefs,
      });
    }

    if (filterModuleId) {
      for (const [oldUri] of replacements) {
        const usages = await collectUriUsages(oldUri);
        const others = usages.declaredOn.filter((site) => !site.inThisRun);
        if (others.length === 0) continue;
        blocking.push({
          kind: "shared_uri_with_other_module",
          why: "This run would rewrite a URI that another module also declares.",
          oldUri,
          newUri: replacements.get(oldUri),
          declaredOn: usages.declaredOn,
          otherModules: others,
          referencedFrom: usages.referencedFrom,
          moduleStatementRefs: usages.moduleStatementRefs,
        });
        inc(stats, "shared_uri_with_other_module");
        pushSample(samples, "shared_uri_with_other_module", { oldUri });
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
