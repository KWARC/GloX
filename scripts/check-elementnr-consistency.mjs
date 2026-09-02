/**
 * Check whether modules that share an elementnr have identical or
 * near-identical title / Inhalt / Lernziele.
 *
 * Usage:
 *   node scripts/check-elementnr-consistency.mjs
 *   node scripts/check-elementnr-consistency.mjs --threshold 0.9 --out /tmp/elementnr.json
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  collectModuleRecords,
  loadIndex,
  resolveModulesDir,
} from "./moduleCatalogRecords.mjs";
import {
  classifyRecordsByElementnr,
  DEFAULT_NEAR_THRESHOLD,
  SIGNATURE_FIELDS,
} from "./moduleDescriptionDuplicates.mjs";

function parseArgs(argv) {
  const opts = {
    modulesDir: process.env.MODULES_DIR?.trim() || "modules",
    outPath: null,
    threshold: DEFAULT_NEAR_THRESHOLD,
    limit: 20,
    includeSingletons: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--modules-dir") {
      opts.modulesDir = argv[++i];
    } else if (arg === "--out") {
      opts.outPath = argv[++i];
    } else if (arg === "--threshold") {
      opts.threshold = Number.parseFloat(argv[++i]);
    } else if (arg === "--limit") {
      opts.limit = Number.parseInt(argv[++i], 10);
    } else if (arg === "--include-singletons") {
      opts.includeSingletons = true;
    } else if (arg === "--help" || arg === "-h") {
      opts.help = true;
    } else if (arg === "--") {
      continue;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isFinite(opts.limit) || opts.limit < 0) {
    throw new Error("--limit must be a non-negative integer");
  }
  if (!Number.isFinite(opts.threshold) || opts.threshold < 0 || opts.threshold > 1) {
    throw new Error("--threshold must be a number between 0 and 1");
  }
  return opts;
}

function helpText() {
  return `Usage: node scripts/check-elementnr-consistency.mjs [options]

Groups catalog modules by elementnr, then asks whether every module
with that exam number has the same title / Inhalt / Lernziele
(exact, or near at --threshold).

Options:
  --threshold <0-1>       Near-duplicate cutoff (default ${DEFAULT_NEAR_THRESHOLD})
  --modules-dir <dir>     Catalog root (default: MODULES_DIR or ./modules)
  --out <path>            Write JSON report
  --limit <n>             Divergent groups to print (default 20)
  --include-singletons    Also list elementnrs with a single moduleId
`;
}

function memberLite(member) {
  return {
    moduleId: member.moduleId,
    path: member.path,
    faculty: member.faculty,
    subjectArea: member.subjectArea,
    title: member.title,
  };
}

function printSummary(report, limit) {
  const { stats, answer, threshold } = report;
  console.log("elementnr consistency (title | Inhalt | Lernziele)");
  console.log(`  near threshold: ${threshold}`);
  console.log(`  loaded modules: ${stats.loaded}`);
  console.log(`  missing elementnr: ${stats.missingElementnr}`);
  console.log(`  distinct elementnrs: ${stats.elementnrs}`);
  console.log(`  elementnrs with 2+ moduleIds: ${stats.multiModuleElementnrs}`);
  console.log(`    exact (byte-identical): ${stats.exact}`);
  console.log(`    near (not exact): ${stats.near}`);
  console.log(`      normalized: ${stats.nearNormalized}`);
  console.log(`      similar: ${stats.nearSimilar}`);
  console.log(`      mixed: ${stats.nearMixed}`);
  console.log(`    divergent: ${stats.divergent}`);
  console.log(`  answer: ${answer}`);

  const shown = report.divergentGroups.slice(0, limit);
  if (shown.length === 0) {
    console.log("  no divergent elementnrs");
    return;
  }
  console.log(`  weakest divergent groups (up to ${limit}):`);
  for (const group of shown) {
    const ids = group.members.map((m) => m.moduleId).join(", ");
    const titles = group.titles.map((t) => JSON.stringify(t)).join(" | ");
    console.log(
      `    elementnr=${group.elementnr} modules=${group.moduleCount} signatures=${group.exactSignatureCount} minScore=${group.minScore.toFixed(3)}`,
    );
    console.log(`      titles: ${titles}`);
    console.log(`      ids: ${ids}`);
  }
  if (report.divergentGroups.length > shown.length) {
    console.log(
      `  … ${report.divergentGroups.length - shown.length} more divergent elementnrs`,
    );
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(helpText());
    return;
  }

  const modulesDir = resolveModulesDir(opts.modulesDir);
  const index = await loadIndex(modulesDir);
  const collected = await collectModuleRecords(modulesDir, index);
  const { groups, missingElementnr } = classifyRecordsByElementnr(
    collected.records,
    { threshold: opts.threshold },
  );

  const multi = groups.filter((g) => g.moduleCount >= 2);
  const exact = multi.filter((g) => g.verdict === "exact");
  const near = multi.filter((g) => g.verdict === "near");
  const divergent = multi.filter((g) => g.verdict === "divergent");
  const allNearOrExact = divergent.length === 0;

  const answer = allNearOrExact
    ? `yes — every elementnr with 2+ modules is exact or near (≥ ${opts.threshold})`
    : `no — ${divergent.length} of ${multi.length} shared elementnrs have texts that are not near-identical`;

  const reportGroups = opts.includeSingletons ? groups : multi;

  const report = {
    generatedAt: new Date().toISOString(),
    modulesDir,
    fields: SIGNATURE_FIELDS,
    threshold: opts.threshold,
    answer,
    allSharedElementnrsExactOrNear: allNearOrExact,
    stats: {
      loaded: collected.records.length,
      missingFiles: collected.missingFiles.length,
      parseErrors: collected.parseErrors.length,
      missingElementnr: missingElementnr.length,
      elementnrs: groups.length,
      multiModuleElementnrs: multi.length,
      exact: exact.length,
      near: near.length,
      nearNormalized: near.filter((g) => g.nearKind === "normalized").length,
      nearSimilar: near.filter((g) => g.nearKind === "similar").length,
      nearMixed: near.filter((g) => g.nearKind === "mixed").length,
      divergent: divergent.length,
    },
    missingElementnrModuleIds: missingElementnr.map((r) => r.moduleId),
    divergentGroups: divergent.map((g) => ({
      ...g,
      members: g.members.map(memberLite),
    })),
    groups: reportGroups.map((g) => ({
      ...g,
      members: g.members.map(memberLite),
    })),
  };

  printSummary(report, opts.limit);

  if (opts.outPath) {
    const outPath = path.isAbsolute(opts.outPath)
      ? opts.outPath
      : path.resolve(process.cwd(), opts.outPath);
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
