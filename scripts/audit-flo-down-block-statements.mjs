/**
 * Phase 0 — read-only audit of FloDownBlock.statement JSON.
 *
 * Usage:
 *   pnpm audit:statements
 *
 * Requires DATABASE_URL. Does not modify data.
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

function auditStatement(statement) {
  const issues = [];
  const definiendumUris = new Set();
  let symdeclTrue = 0;
  let symdeclFalse = 0;
  let hasSymdeclField = 0;
  let forSymbols = [];

  if (Array.isArray(statement)) {
    issues.push("top_level_array");
  } else if (isObject(statement) && statement.type === "root") {
    issues.push("root_wrapper");
  }

  const top = Array.isArray(statement)
    ? statement
    : isObject(statement) && statement.type === "root"
      ? statement.content
      : [statement];

  for (const block of top) {
    if (!isObject(block)) continue;
    if (block.type === "definition" && Array.isArray(block.for_symbols)) {
      forSymbols = block.for_symbols;
    }
    walkNodes(block, (node) => {
      if (node.type !== "definiendum") return;
      if ("symdecl" in node) hasSymdeclField += 1;
      if (node.symdecl === true) symdeclTrue += 1;
      if (node.symdecl === false) symdeclFalse += 1;
      if (typeof node.uri === "string" && node.uri.trim()) {
        definiendumUris.add(node.uri.trim());
      }
    });
  }

  const localForSymbols = forSymbols.filter(
    (s) => typeof s === "string" && !s.startsWith("http"),
  );
  const forSymbolsNotInDefinienda = localForSymbols.filter(
    (s) => !definiendumUris.has(s),
  );
  const definiendaNotInForSymbols = [...definiendumUris].filter(
    (u) => !u.startsWith("http") && !localForSymbols.includes(u),
  );

  if (forSymbolsNotInDefinienda.length > 0) {
    issues.push("for_symbols_without_definiendum");
  }
  if (definiendaNotInForSymbols.length > 0) {
    issues.push("definiendum_without_for_symbols");
  }
  if (hasSymdeclField > 0) issues.push("has_symdecl");
  if (symdeclTrue > 0) issues.push("symdecl_true");
  if (symdeclFalse > 0) issues.push("symdecl_false");

  return {
    issues,
    symdeclTrue,
    symdeclFalse,
    forSymbolsCount: forSymbols.length,
    definiendumCount: definiendumUris.size,
    forSymbolsNotInDefinienda,
    definiendaNotInForSymbols,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(
      'SELECT id, statement FROM "FloDownBlock"',
    );
    const { rows: versionRows } = await client.query(
      'SELECT id, statement FROM "FloDownBlockVersion"',
    );

    const summary = {
      floDownBlocks: rows.length,
      versions: versionRows.length,
      issueCounts: {},
      examples: {},
    };

    function tally(source, row) {
      const result = auditStatement(row.statement);
      for (const issue of result.issues) {
        summary.issueCounts[issue] = (summary.issueCounts[issue] ?? 0) + 1;
        if (!summary.examples[issue]) {
          summary.examples[issue] = { source, id: row.id, ...result };
        }
      }
    }

    for (const row of rows) tally("FloDownBlock", row);
    for (const row of versionRows) tally("FloDownBlockVersion", row);

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
