/**
 * One-off backfill: populate FloDownBlock.declaredSymbols from legacy statement JSON.
 *
 * Derivation order (when declaredSymbols is empty):
 *   1. definiendum nodes with symdecl === true
 *   2. definition.for_symbols (local names only, as fallback)
 *
 * Usage:
 *   pnpm backfill:declared-symbols           # dry run (default)
 *   pnpm backfill:declared-symbols -- --apply
 *
 * Requires DATABASE_URL.
 */
import pg from "pg";

const { Client } = pg;

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

/** Mirrors resolveDeclaredSymbolNames / getDeclaredSymbolUris legacy fallback. */
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

  if (fromSymdecl.length > 0) {
    return { symbols: fromSymdecl, source: "symdecl" };
  }

  const fromForSymbols = forSymbols
    .filter((s) => typeof s === "string" && s.trim() && !s.startsWith("http"))
    .map((s) => s.trim())
    .filter((s, i, arr) => arr.indexOf(s) === i);

  if (fromForSymbols.length > 0) {
    return { symbols: fromForSymbols, source: "for_symbols" };
  }

  return { symbols: [], source: null };
}

async function main() {
  const apply = process.argv.includes("--apply");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(`
      SELECT
        id,
        "futureRepo",
        "filePath",
        "fileName",
        language,
        "declaredSymbols",
        statement
      FROM "FloDownBlock"
      WHERE cardinality("declaredSymbols") = 0
      ORDER BY "createdAt" ASC
    `);

    const candidates = [];

    for (const row of rows) {
      const { symbols, source } = collectLegacyDeclaredSymbols(row.statement);
      if (symbols.length === 0) continue;

      candidates.push({
        id: row.id,
        futureRepo: row.futureRepo,
        filePath: row.filePath,
        fileName: row.fileName,
        language: row.language,
        source,
        declaredSymbols: symbols,
      });
    }

    let applied = 0;

    if (apply && candidates.length > 0) {
      await client.query("BEGIN");
      try {
        for (const row of candidates) {
          await client.query(
            `UPDATE "FloDownBlock"
             SET "declaredSymbols" = $2::text[]
             WHERE id = $1`,
            [row.id, row.declaredSymbols],
          );
          applied += 1;
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    const summary = {
      mode: apply ? "apply" : "dry-run",
      scannedEmptyDeclaredSymbols: rows.length,
      candidates: candidates.length,
      applied,
      bySource: {
        symdecl: candidates.filter((r) => r.source === "symdecl").length,
        for_symbols: candidates.filter((r) => r.source === "for_symbols").length,
      },
      rows: candidates.map(({ id, source, declaredSymbols, ...identity }) => ({
        id,
        source,
        declaredSymbols,
        ...identity,
      })),
    };

    console.log(JSON.stringify(summary, null, 2));

    if (!apply && candidates.length > 0) {
      console.error(
        `\nDry run only. Re-run with --apply to update ${candidates.length} row(s).`,
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
