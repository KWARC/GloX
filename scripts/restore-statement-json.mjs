/**
 * Copy *_bkp statement JSON back onto the live columns. Does not change *_bkp.
 *
 * Restores:
 *   FloDownBlock.statement_bkp → statement
 *   ModuleDescription *_bkp → title/inhalt/lernziele Statement
 *
 * Does not restore declaredSymbolsInfo. Re-run
 *   pnpm backfill:declared-symbols-info -- --apply
 * after this if you still want opaque URIs in `uri` / `for_symbols` only.
 *
 * Usage:
 *   pnpm restore:statement-json           # dry run
 *   pnpm restore:statement-json -- --apply
 *
 * Requires DATABASE_URL.
 */
import pg from "pg";

const { Client } = pg;

async function columnExists(client, table, column) {
  const { rows } = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return rows.length > 0;
}

async function requireBackupColumns(client) {
  const needed = [
    ["FloDownBlock", "statement_bkp"],
    ["ModuleDescription", "titleStatement_bkp"],
    ["ModuleDescription", "inhaltStatement_bkp"],
    ["ModuleDescription", "lernzieleStatement_bkp"],
  ];
  const missing = [];
  for (const [table, column] of needed) {
    if (!(await columnExists(client, table, column))) {
      missing.push(`${table}.${column}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing backup columns: ${missing.join(", ")}. Run pnpm prisma migrate deploy first.`,
    );
  }
}

async function countRestoreable(client) {
  const blocks = await client.query(`
    SELECT COUNT(*)::int AS n
    FROM "FloDownBlock"
    WHERE "statement_bkp" IS NOT NULL
  `);
  const modules = await client.query(`
    SELECT COUNT(*)::int AS n
    FROM "ModuleDescription"
    WHERE "titleStatement_bkp" IS NOT NULL
      AND "inhaltStatement_bkp" IS NOT NULL
      AND "lernzieleStatement_bkp" IS NOT NULL
  `);
  const skippedBlocks = await client.query(`
    SELECT COUNT(*)::int AS n
    FROM "FloDownBlock"
    WHERE "statement_bkp" IS NULL
  `);
  const skippedModules = await client.query(`
    SELECT COUNT(*)::int AS n
    FROM "ModuleDescription"
    WHERE "titleStatement_bkp" IS NULL
       OR "inhaltStatement_bkp" IS NULL
       OR "lernzieleStatement_bkp" IS NULL
  `);
  return {
    floDownBlocks: blocks.rows[0].n,
    moduleDescriptions: modules.rows[0].n,
    skippedBlocks: skippedBlocks.rows[0].n,
    skippedModules: skippedModules.rows[0].n,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await requireBackupColumns(client);
    const pending = await countRestoreable(client);

    let appliedBlocks = 0;
    let appliedModules = 0;

    if (apply) {
      await client.query("BEGIN");
      try {
        const blockResult = await client.query(`
          UPDATE "FloDownBlock"
          SET statement = "statement_bkp"
          WHERE "statement_bkp" IS NOT NULL
        `);
        appliedBlocks = blockResult.rowCount ?? 0;

        const moduleResult = await client.query(`
          UPDATE "ModuleDescription"
          SET
            "titleStatement" = "titleStatement_bkp",
            "inhaltStatement" = "inhaltStatement_bkp",
            "lernzieleStatement" = "lernzieleStatement_bkp"
          WHERE "titleStatement_bkp" IS NOT NULL
            AND "inhaltStatement_bkp" IS NOT NULL
            AND "lernzieleStatement_bkp" IS NOT NULL
        `);
        appliedModules = moduleResult.rowCount ?? 0;

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
          pending,
          appliedBlocks,
          appliedModules,
        },
        null,
        2,
      ),
    );

    if (!apply) {
      console.error(
        "\nDry run only. Re-run with --apply to copy *_bkp onto live statement columns.",
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
