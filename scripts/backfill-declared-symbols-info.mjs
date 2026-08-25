/**
 * S-SYM-12 one-shot: fill FloDownBlock.declaredSymbolsInfo and rewrite short
 * names in current statement JSON (not FloDownBlockVersion). Temporary mint
 * lives only in this script.
 *
 * Usage:
 *   pnpm backfill:declared-symbols-info           # dry run
 *   pnpm backfill:declared-symbols-info -- --apply
 *
 * Run after prisma migrate deploy that adds declaredSymbolsInfo.
 * Requires DATABASE_URL. Idempotent. Exits 0 if declaredSymbolsInfo is missing
 * (migrate first) or if declaredSymbols was already dropped.
 */
import pg from "pg";

const { Client } = pg;
const FLODOWN_MATHHUB_BASE = "http://mathhub.info";

function mintSymbolUri({ futureRepo, filePath, fileName, symbolName }) {
  const parts = [
    `a=${futureRepo}`,
    filePath.trim() ? `p=${filePath.trim()}` : "",
    `m=${fileName}`,
    `s=${symbolName}`,
  ].filter(Boolean);
  return `${FLODOWN_MATHHUB_BASE}?${parts.join("&")}`;
}

function backfillDeclaration(symbolName, identity) {
  const name = symbolName.trim();
  if (name.startsWith("http://") || name.startsWith("https://")) {
    return { symbolName: name, symbolUri: name };
  }
  return {
    symbolName: name,
    symbolUri: mintSymbolUri({ ...identity, symbolName: name }),
  };
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function walkNodes(node, visit) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) walkNodes(item, visit);
    return;
  }
  if (!isObject(node)) return;
  visit(node);
  if (Array.isArray(node.content)) {
    for (const child of node.content) walkNodes(child, visit);
  }
}

function topBlocks(statement) {
  if (Array.isArray(statement)) return statement;
  if (isObject(statement) && statement.type === "root") {
    return Array.isArray(statement.content) ? statement.content : [];
  }
  return [statement];
}

function collectLegacyDeclaredSymbols(statement) {
  const fromSymdecl = [];
  const seen = new Set();
  let forSymbols = [];

  for (const block of topBlocks(statement)) {
    if (!isObject(block)) continue;
    if (block.type === "definition" && Array.isArray(block.for_symbols)) {
      forSymbols = block.for_symbols;
    }
    walkNodes(block, (node) => {
      if (node.type !== "definiendum") return;
      if (node.symdecl !== true) return;
      const uri = typeof node.uri === "string" ? node.uri.trim() : "";
      if (!uri || seen.has(uri)) return;
      seen.add(uri);
      fromSymdecl.push(uri);
    });
  }

  if (fromSymdecl.length > 0) return fromSymdecl;

  return forSymbols
    .filter((s) => typeof s === "string" && s.trim() && !s.startsWith("http"))
    .map((s) => s.trim())
    .filter((s, i, arr) => arr.indexOf(s) === i);
}

function parseInfo(value) {
  if (!Array.isArray(value)) return [];
  const result = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const symbolName =
      typeof item.symbolName === "string" ? item.symbolName.trim() : "";
    const symbolUri =
      typeof item.symbolUri === "string" ? item.symbolUri.trim() : "";
    if (!symbolName || !symbolUri) continue;
    result.push({ ...item, symbolName, symbolUri });
  }
  return result;
}

function replaceOpaqueUrisInValue(value, replacements) {
  if (typeof value === "string") {
    return replacements.get(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceOpaqueUrisInValue(item, replacements));
  }
  if (value && typeof value === "object") {
    const next = {};
    for (const [key, child] of Object.entries(value)) {
      next[key] = replaceOpaqueUrisInValue(child, replacements);
    }
    return next;
  }
  return value;
}

async function columnExists(client, table, column) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return rows.length > 0;
}

async function main() {
  const apply = process.argv.includes("--apply");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const hasDeclaredSymbols = await columnExists(client, "FloDownBlock", "declaredSymbols");
    const hasInfo = await columnExists(client, "FloDownBlock", "declaredSymbolsInfo");

    if (!hasInfo) {
      console.log(JSON.stringify({ skipped: true, reason: "declaredSymbolsInfo missing" }));
      return;
    }

    if (!hasDeclaredSymbols) {
      console.log(
        JSON.stringify({
          skipped: true,
          reason: "declaredSymbols already dropped; cutover complete",
        }),
      );
      return;
    }

    const { rows: blocks } = await client.query(`
      SELECT
        id,
        "futureRepo",
        "filePath",
        "fileName",
        language,
        "declaredSymbols",
        "declaredSymbolsInfo",
        statement
      FROM "FloDownBlock"
      ORDER BY "createdAt" ASC
    `);

    const replacements = new Map();
    const planned = [];

    for (const row of blocks) {
      const identity = {
        futureRepo: row.futureRepo,
        filePath: row.filePath,
        fileName: row.fileName,
      };
      const existing = parseInfo(row.declaredSymbolsInfo);
      const names = [];
      const seen = new Set();

      for (const item of existing) {
        if (!seen.has(item.symbolName) && !seen.has(item.symbolUri)) {
          names.push(item.symbolName.startsWith("http") ? item.symbolUri : item.symbolName);
          seen.add(item.symbolName);
          seen.add(item.symbolUri);
        }
      }
      for (const name of row.declaredSymbols ?? []) {
        if (typeof name === "string" && name.trim() && !seen.has(name.trim())) {
          names.push(name.trim());
          seen.add(name.trim());
        }
      }
      if (names.length === 0) {
        for (const name of collectLegacyDeclaredSymbols(row.statement)) {
          if (!seen.has(name)) {
            names.push(name);
            seen.add(name);
          }
        }
      }

      const info = [];
      for (const name of names) {
        const draft = backfillDeclaration(name, identity);
        if (name !== draft.symbolUri) {
          replacements.set(name, draft.symbolUri);
        }
        const prior = existing.find(
          (item) => item.symbolUri === draft.symbolUri || item.symbolName === draft.symbolName,
        );
        info.push({
          symbolName: draft.symbolName,
          symbolUri: draft.symbolUri,
          hasConfirmed: prior?.hasConfirmed === true,
          confirmedById: prior?.confirmedById ?? null,
          confirmedBy: prior?.confirmedBy ?? null,
          ...(prior?.alias ? { alias: prior.alias } : {}),
        });
      }

      planned.push({ id: row.id, info, statement: row.statement });
    }

    const updates = planned.map((row) => ({
      id: row.id,
      info: row.info,
      statement: replaceOpaqueUrisInValue(row.statement, replacements),
    }));

    const { rows: modules } = await client.query(`
      SELECT id, "titleStatement", "inhaltStatement", "lernzieleStatement"
      FROM "ModuleDescription"
    `);

    const moduleUpdates = modules.map((row) => ({
      id: row.id,
      titleStatement: replaceOpaqueUrisInValue(row.titleStatement, replacements),
      inhaltStatement: replaceOpaqueUrisInValue(row.inhaltStatement, replacements),
      lernzieleStatement: replaceOpaqueUrisInValue(row.lernzieleStatement, replacements),
    }));

    let appliedBlocks = 0;
    let appliedModules = 0;

    if (apply) {
      await client.query("BEGIN");
      try {
        for (const row of updates) {
          await client.query(
            `UPDATE "FloDownBlock"
             SET "declaredSymbolsInfo" = $2::jsonb,
                 "declaredSymbols" = $3::text[],
                 statement = $4::jsonb
             WHERE id = $1`,
            [
              row.id,
              JSON.stringify(row.info),
              row.info.map((item) => item.symbolUri),
              JSON.stringify(row.statement),
            ],
          );
          appliedBlocks += 1;
        }
        for (const row of moduleUpdates) {
          await client.query(
            `UPDATE "ModuleDescription"
             SET "titleStatement" = $2::jsonb,
                 "inhaltStatement" = $3::jsonb,
                 "lernzieleStatement" = $4::jsonb
             WHERE id = $1`,
            [
              row.id,
              JSON.stringify(row.titleStatement),
              JSON.stringify(row.inhaltStatement),
              JSON.stringify(row.lernzieleStatement),
            ],
          );
          appliedModules += 1;
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log(
      JSON.stringify(
        {
          mode: apply ? "apply" : "dry-run",
          blocks: updates.length,
          modules: moduleUpdates.length,
          replacementCount: replacements.size,
          appliedBlocks,
          appliedModules,
        },
        null,
        2,
      ),
    );

    if (!apply) {
      console.error("\nDry run only. Re-run with --apply to write rows.");
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
