/**
 * Copy live statement JSON into *_bkp columns. Does not change originals.
 *
 * Backs up:
 *   FloDownBlock.statement → statement_bkp
 *   ModuleDescription title/inhalt/lernziele → *_bkp
 *
 * Only fills NULL backups, so a later re-run does not overwrite with rewritten JSON.
 *
 * Usage:
 *   pnpm backup:statement-json           # dry run
 *   pnpm backup:statement-json -- --apply
 *
 * Run after prisma migrate deploy (statement_bkp columns) and before
 * pnpm backfill:declared-symbols-info -- --apply.
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

async function countPending(client) {
  const blocks = await client.query(`
    SELECT COUNT(*)::int AS n
    FROM "FloDownBlock"
    WHERE "statement_bkp" IS NULL
  `);
  const modules = await client.query(`
    SELECT COUNT(*)::int AS n
    FROM "ModuleDescription"
    WHERE "titleStatement_bkp" IS NULL
       OR "inhaltStatement_bkp" IS NULL
       OR "lernzieleStatement_bkp" IS NULL
  `);
  return {
    floDownBlocks: blocks.rows[0].n,
    moduleDescriptions: modules.rows[0].n,
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
    const pending = await countPending(client);

    let appliedBlocks = 0;
    let appliedModules = 0;

    if (apply) {
      await client.query("BEGIN");
      try {
        const blockResult = await client.query(`
          UPDATE "FloDownBlock"
          SET "statement_bkp" = statement
          WHERE "statement_bkp" IS NULL
        `);
        appliedBlocks = blockResult.rowCount ?? 0;

        const moduleResult = await client.query(`
          UPDATE "ModuleDescription"
          SET
            "titleStatement_bkp" = COALESCE("titleStatement_bkp", "titleStatement"),
            "inhaltStatement_bkp" = COALESCE("inhaltStatement_bkp", "inhaltStatement"),
            "lernzieleStatement_bkp" = COALESCE("lernzieleStatement_bkp", "lernzieleStatement")
          WHERE "titleStatement_bkp" IS NULL
             OR "inhaltStatement_bkp" IS NULL
             OR "lernzieleStatement_bkp" IS NULL
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
        "\nDry run only. Re-run with --apply to copy statements into *_bkp columns.",
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
