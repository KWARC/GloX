/**
 * Offline duplicate detector for module catalog JSON.
 *
 * Compares only title, Inhalt, and Lernziele und Kompetenzen.
 *
 * Usage:
 *   node scripts/find-module-description-duplicates.mjs --match exact
 *   node scripts/find-module-description-duplicates.mjs --match near
 *   node scripts/find-module-description-duplicates.mjs --match near --threshold 0.9 --out /tmp/near.json
 *   node scripts/find-module-description-duplicates.mjs --write-index
 *
 * Options:
 *   --match exact|near    Required. Duplicate algorithm
 *   --threshold <0-1>     Near-duplicate Jaccard cutoff (default 0.9)
 *   --modules-dir <dir>   Catalog root (default: MODULES_DIR or ./modules)
 *   --out <path>          Write full JSON report
 *   --include-empty       Also cluster modules whose three fields are all ""
 *   --limit <n>           Print only the first n clusters in the summary
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  collectModuleRecords,
  loadIndex,
  resolveModulesDir,
} from "./moduleCatalogRecords.mjs";
import {
  buildDuplicatesIndex,
  clusterDuplicates,
  DEFAULT_NEAR_THRESHOLD,
  MATCH_ALGORITHMS,
  SIGNATURE_FIELDS,
} from "./moduleDescriptionDuplicates.mjs";

function parseArgs(argv) {
  const opts = {
    match: null,
    modulesDir: process.env.MODULES_DIR?.trim() || "modules",
    outPath: null,
    includeEmpty: false,
    threshold: DEFAULT_NEAR_THRESHOLD,
    limit: 20,
    writeIndex: false,
    indexOutPath: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--match") {
      opts.match = argv[++i];
    } else if (arg === "--modules-dir") {
      opts.modulesDir = argv[++i];
    } else if (arg === "--out") {
      opts.outPath = argv[++i];
    } else if (arg === "--include-empty") {
      opts.includeEmpty = true;
    } else if (arg === "--threshold") {
      opts.threshold = Number.parseFloat(argv[++i]);
    } else if (arg === "--limit") {
      opts.limit = Number.parseInt(argv[++i], 10);
    } else if (arg === "--write-index") {
      opts.writeIndex = true;
    } else if (arg === "--index-out") {
      opts.indexOutPath = argv[++i];
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
  if (!opts.help) {
    if (!opts.writeIndex && !opts.match) {
      throw new Error(
        `--match is required (${MATCH_ALGORITHMS.join(" | ")}) unless --write-index`,
      );
    }
    if (opts.match && !MATCH_ALGORITHMS.includes(opts.match)) {
      throw new Error(
        `Unknown --match "${opts.match}". Use one of: ${MATCH_ALGORITHMS.join(", ")}`,
      );
    }
  }
  return opts;
}

function helpText() {
  return `Usage: node scripts/find-module-description-duplicates.mjs --match exact|near [options]
       node scripts/find-module-description-duplicates.mjs --write-index [options]

Options:
  --match exact|near   Cluster report (required unless --write-index)
  --write-index        Emit MODULES_DIR/duplicates.json (exact + near map)
  --index-out <path>   Override path for --write-index
  --threshold <0-1>    Near-duplicate cutoff (default ${DEFAULT_NEAR_THRESHOLD})
  --modules-dir <dir>  Catalog root (default: MODULES_DIR or ./modules)
  --out <path>         Write JSON cluster report (with --match)
  --include-empty      Cluster modules with all three fields empty
  --limit <n>          Clusters to print in the text summary (default 20)
`;
}

function clusterElementnrs(members) {
  const values = [
    ...new Set(members.map((m) => m.elementnr).filter(Boolean)),
  ];
  values.sort();
  return values;
}

function toReportCluster(cluster) {
  return {
    signatureHash: cluster.signatureHash,
    size: cluster.size,
    title: cluster.title,
    inhaltLength: cluster.inhaltLength,
    lernzieleLength: cluster.lernzieleLength,
    empty: cluster.empty,
    kind: cluster.kind,
    minScore: cluster.minScore,
    elementnrs: clusterElementnrs(cluster.members),
    members: cluster.members.map(
      ({ moduleId, elementnr, path: relPath, faculty, subjectArea }) => ({
        moduleId,
        elementnr,
        path: relPath,
        faculty,
        subjectArea,
      }),
    ),
  };
}

function countIds(clusters) {
  const ids = new Set();
  for (const cluster of clusters) {
    for (const member of cluster.members) ids.add(member.moduleId);
  }
  return ids.size;
}

function printSummary(report, limit) {
  const { stats, clusters, match } = report;
  console.log(`${match} module-description duplicates`);
  console.log(`  fields: ${SIGNATURE_FIELDS.join(" | ")}`);
  if (match === "near") {
    console.log(`  threshold: ${report.threshold}`);
  }
  console.log(`  index entries: ${stats.indexEntries}`);
  console.log(`  loaded: ${stats.loaded}`);
  console.log(`  missing files: ${stats.missingFiles}`);
  console.log(`  parse errors: ${stats.parseErrors}`);
  console.log(`  empty 3-field signatures: ${stats.emptySignature}`);
  console.log(
    `  same-id path mismatches (3 fields): ${stats.pathFieldMismatches}`,
  );
  console.log(`  clusters (2+ moduleIds): ${stats.clusters}`);
  console.log(`  moduleIds in those clusters: ${stats.moduleIdsInClusters}`);
  if (match === "near") {
    console.log(`    kind=normalized: ${stats.normalizedClusters}`);
    console.log(`    kind=similar: ${stats.similarClusters}`);
    console.log(`    kind=mixed: ${stats.mixedClusters}`);
  }

  const shown = clusters.slice(0, limit);
  if (shown.length === 0) {
    console.log("  no clusters");
    return;
  }
  console.log(`  largest clusters (up to ${limit}):`);
  for (const cluster of shown) {
    const ids = cluster.members.map((m) => m.moduleId).join(", ");
    const elementnr =
      cluster.elementnrs.length > 0
        ? ` elementnr=${cluster.elementnrs.join("|")}`
        : "";
    const kind = cluster.kind ? ` kind=${cluster.kind}` : "";
    const score =
      match === "near"
        ? ` minScore=${Number(cluster.minScore).toFixed(3)}`
        : "";
    console.log(
      `    size=${cluster.size} title=${JSON.stringify(cluster.title)}${kind}${score}${elementnr}`,
    );
    console.log(`      ids: ${ids}`);
  }
  if (clusters.length > shown.length) {
    console.log(`  … ${clusters.length - shown.length} more clusters`);
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

  if (opts.writeIndex) {
    const exactClusters = clusterDuplicates(collected.records, {
      match: "exact",
      includeEmpty: opts.includeEmpty,
    });
    const nearClusters = clusterDuplicates(collected.records, {
      match: "near",
      includeEmpty: opts.includeEmpty,
      threshold: opts.threshold,
    });
    const duplicateIndex = buildDuplicatesIndex({
      exactClusters,
      nearClusters,
      generatedAt: new Date().toISOString(),
      nearThreshold: opts.threshold,
      fields: SIGNATURE_FIELDS,
    });
    const indexOut = opts.indexOutPath
      ? path.isAbsolute(opts.indexOutPath)
        ? opts.indexOutPath
        : path.resolve(process.cwd(), opts.indexOutPath)
      : path.join(modulesDir, "duplicates.json");
    await writeFile(
      indexOut,
      `${JSON.stringify(duplicateIndex, null, 2)}\n`,
      "utf8",
    );
    console.log(
      `Wrote duplicate index (${Object.keys(duplicateIndex.modules).length} module keys) to ${indexOut}`,
    );
    if (!opts.match) {
      return;
    }
  }

  const clusters = clusterDuplicates(collected.records, {
    match: opts.match,
    includeEmpty: opts.includeEmpty,
    threshold: opts.threshold,
  });

  const reportClusters = clusters.map(toReportCluster);
  const report = {
    generatedAt: new Date().toISOString(),
    modulesDir,
    match: opts.match,
    threshold: opts.match === "near" ? opts.threshold : null,
    fields: SIGNATURE_FIELDS,
    includeEmpty: opts.includeEmpty,
    stats: {
      indexEntries: Object.keys(index).length,
      loaded: collected.records.length,
      missingFiles: collected.missingFiles.length,
      parseErrors: collected.parseErrors.length,
      emptySignature: collected.emptySignature,
      pathFieldMismatches: collected.pathFieldMismatches.length,
      clusters: reportClusters.length,
      moduleIdsInClusters: countIds(reportClusters),
      normalizedClusters: reportClusters.filter((c) => c.kind === "normalized")
        .length,
      similarClusters: reportClusters.filter((c) => c.kind === "similar")
        .length,
      mixedClusters: reportClusters.filter((c) => c.kind === "mixed").length,
    },
    missingFiles: collected.missingFiles,
    parseErrors: collected.parseErrors,
    pathFieldMismatches: collected.pathFieldMismatches,
    clusters: reportClusters,
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
