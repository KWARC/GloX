/**
 * Duplicate grouping for FAU module catalog JSON.
 *
 * Signature fields (GloX extraction sources):
 *   - title
 *   - descriptionSections["Inhalt"]
 *   - descriptionSections["Lernziele und Kompetenzen"]
 *
 * Algorithms:
 *   exact — byte-identical 3-field payload
 *   near  — not exact, but equal after normalization, or field-wise
 *            token Jaccard at/above a threshold
 */
import { createHash } from "node:crypto";

export const SIGNATURE_FIELDS = [
  "title",
  "Inhalt",
  "Lernziele und Kompetenzen",
];

export const MATCH_ALGORITHMS = ["exact", "near"];

export const DEFAULT_NEAR_THRESHOLD = 0.9;

export function section(descriptionSections, key) {
  if (!descriptionSections || typeof descriptionSections !== "object") {
    return "";
  }
  const value = descriptionSections[key];
  return typeof value === "string" ? value : "";
}

export function extractSignatureFields(catalog) {
  const title = typeof catalog?.title === "string" ? catalog.title : "";
  const inhalt = section(catalog?.descriptionSections, "Inhalt");
  const lernziele = section(
    catalog?.descriptionSections,
    "Lernziele und Kompetenzen",
  );
  return { title, inhalt, lernziele };
}

/** Exact payload used for grouping. Whitespace and Unicode are not rewritten. */
export function exactSignaturePayload({ title, inhalt, lernziele }) {
  return JSON.stringify([title, inhalt, lernziele]);
}

export function hashPayload(payload) {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function isEmptySignature({ title, inhalt, lernziele }) {
  return title === "" && inhalt === "" && lernziele === "";
}

export function foldGermanUmlauts(value) {
  return value
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
}

/** Near-duplicate normalization: NFC, case, umlauts, markdown markers, whitespace. */
export function normalizeForNear(value) {
  return foldGermanUmlauts(
    value
      .normalize("NFC")
      .replaceAll("\r\n", "\n")
      .replaceAll("\r", "\n")
      .toLowerCase()
      .replace(/\*\*/g, "")
      .replace(/^\s*[*•-]\s+/gm, ""),
  )
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizedSignaturePayload({ title, inhalt, lernziele }) {
  return JSON.stringify([
    normalizeForNear(title),
    normalizeForNear(inhalt),
    normalizeForNear(lernziele),
  ]);
}

export function tokenize(normalized) {
  if (!normalized) return new Set();
  return new Set(normalized.split(" ").filter(Boolean));
}

export function jaccard(left, right) {
  if (left.size === 0 && right.size === 0) return 1;
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  const [smaller, larger] =
    left.size <= right.size ? [left, right] : [right, left];
  for (const token of smaller) {
    if (larger.has(token)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

export function fieldTokens(fields) {
  return {
    title: tokenize(normalizeForNear(fields.title)),
    inhalt: tokenize(normalizeForNear(fields.inhalt)),
    lernziele: tokenize(normalizeForNear(fields.lernziele)),
  };
}

export function similarityFromTokens(left, right) {
  return (
    0.2 * jaccard(left.title, right.title) +
    0.4 * jaccard(left.inhalt, right.inhalt) +
    0.4 * jaccard(left.lernziele, right.lernziele)
  );
}

/**
 * Weighted Jaccard over the three GloX fields.
 * Title 0.2, Inhalt 0.4, Lernziele 0.4.
 */
export function nearSimilarity(leftFields, rightFields) {
  return similarityFromTokens(fieldTokens(leftFields), fieldTokens(rightFields));
}

/**
 * Relation between two 3-field signatures.
 * kind: exact | normalized | similar | divergent
 */
export function pairRelation(leftFields, rightFields, threshold = DEFAULT_NEAR_THRESHOLD) {
  if (exactSignaturePayload(leftFields) === exactSignaturePayload(rightFields)) {
    return { kind: "exact", score: 1 };
  }
  if (
    normalizedSignaturePayload(leftFields) ===
    normalizedSignaturePayload(rightFields)
  ) {
    return { kind: "normalized", score: 1 };
  }
  const score = nearSimilarity(leftFields, rightFields);
  if (score + Number.EPSILON >= threshold) {
    return { kind: "similar", score };
  }
  return { kind: "divergent", score };
}

function uniqueByExactHash(records) {
  const groups = new Map();
  for (const record of records) {
    const hash = hashPayload(exactSignaturePayload(record.fields));
    let group = groups.get(hash);
    if (!group) {
      group = { hash, fields: record.fields, members: [] };
      groups.set(hash, group);
    }
    group.members.push(record);
  }
  return [...groups.values()];
}

/**
 * Classify one elementnr's modules: exact, near, or divergent.
 * Near requires every pair of distinct exact signatures to be
 * normalized-equal or Jaccard >= threshold (clique, not transitive).
 */
export function classifyElementnrGroup(
  records,
  { threshold = DEFAULT_NEAR_THRESHOLD } = {},
) {
  const signatures = uniqueByExactHash(records);
  const titles = [
    ...new Set(records.map((r) => r.fields.title).filter(Boolean)),
  ];
  titles.sort((a, b) => a.localeCompare(b, "de"));

  if (signatures.length <= 1) {
    return {
      verdict: "exact",
      exactSignatureCount: signatures.length,
      minScore: 1,
      titles,
    };
  }

  let minScore = 1;
  let sawNormalized = false;
  let sawSimilar = false;
  let divergent = false;

  for (let i = 0; i < signatures.length; i += 1) {
    for (let j = i + 1; j < signatures.length; j += 1) {
      const rel = pairRelation(
        signatures[i].fields,
        signatures[j].fields,
        threshold,
      );
      if (rel.score < minScore) minScore = rel.score;
      if (rel.kind === "divergent") divergent = true;
      if (rel.kind === "normalized") sawNormalized = true;
      if (rel.kind === "similar") sawSimilar = true;
    }
  }

  if (divergent) {
    return {
      verdict: "divergent",
      exactSignatureCount: signatures.length,
      minScore,
      titles,
    };
  }

  return {
    verdict: "near",
    nearKind: sawSimilar ? (sawNormalized ? "mixed" : "similar") : "normalized",
    exactSignatureCount: signatures.length,
    minScore,
    titles,
  };
}

export function classifyRecordsByElementnr(
  records,
  { threshold = DEFAULT_NEAR_THRESHOLD } = {},
) {
  const missingElementnr = [];
  const byElementnr = new Map();

  for (const record of records) {
    const elementnr =
      typeof record.elementnr === "string" ? record.elementnr.trim() : "";
    if (!elementnr) {
      missingElementnr.push(record);
      continue;
    }
    const list = byElementnr.get(elementnr);
    if (list) list.push(record);
    else byElementnr.set(elementnr, [record]);
  }

  const groups = [];
  for (const [elementnr, members] of byElementnr) {
    const classified = classifyElementnrGroup(members, { threshold });
    groups.push({
      elementnr,
      moduleCount: members.length,
      ...classified,
      members: members.map((m) => ({
        moduleId: m.moduleId,
        path: m.path,
        faculty: m.faculty,
        subjectArea: m.subjectArea,
        title: m.fields.title,
      })),
    });
  }

  groups.sort((a, b) => {
    const rank = { divergent: 0, near: 1, exact: 2 };
    if (rank[a.verdict] !== rank[b.verdict]) {
      return rank[a.verdict] - rank[b.verdict];
    }
    if (a.verdict === "divergent" && a.minScore !== b.minScore) {
      return a.minScore - b.minScore;
    }
    if (b.moduleCount !== a.moduleCount) return b.moduleCount - a.moduleCount;
    return a.elementnr.localeCompare(b.elementnr, "en", { numeric: true });
  });

  return { groups, missingElementnr };
}

function sortMembers(members) {
  return [...members].sort((a, b) =>
    a.moduleId.localeCompare(b.moduleId, "en", { numeric: true }),
  );
}

function distinctSize(members) {
  return new Set(members.map((m) => m.moduleId)).size;
}

function sortClusters(clusters) {
  clusters.sort((a, b) => {
    if (b.size !== a.size) return b.size - a.size;
    return a.title.localeCompare(b.title, "de");
  });
  return clusters;
}

function toCluster(members, extra) {
  const sorted = sortMembers(members);
  const primary = sorted[0]?.fields ?? {
    title: "",
    inhalt: "",
    lernziele: "",
  };
  return {
    signatureHash: extra.signatureHash,
    size: distinctSize(sorted),
    title: primary.title,
    inhaltLength: primary.inhalt.length,
    lernzieleLength: primary.lernziele.length,
    empty: isEmptySignature(primary),
    kind: extra.kind ?? "exact",
    minScore: extra.minScore ?? 1,
    members: sorted,
  };
}

function bucketsToClusters(buckets, { kind = "exact" } = {}) {
  const clusters = [];
  for (const bucket of buckets.values()) {
    if (distinctSize(bucket.members) < 2) continue;
    clusters.push(
      toCluster(bucket.members, {
        signatureHash: bucket.hash,
        kind,
        minScore: 1,
      }),
    );
  }
  return sortClusters(clusters);
}

/**
 * Group records that share an exact 3-field signature.
 * `records` items: { moduleId, fields: { title, inhalt, lernziele }, ...rest }
 */
export function clusterExactDuplicates(records, { includeEmpty = false } = {}) {
  const buckets = new Map();

  for (const record of records) {
    const fields = record.fields;
    if (!includeEmpty && isEmptySignature(fields)) continue;
    const payload = exactSignaturePayload(fields);
    const hash = hashPayload(payload);
    let bucket = buckets.get(hash);
    if (!bucket) {
      bucket = { hash, members: [] };
      buckets.set(hash, bucket);
    }
    bucket.members.push(record);
  }

  return bucketsToClusters(buckets, { kind: "exact" });
}

class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = Array.from({ length: size }, () => 0);
  }

  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }

  union(a, b) {
    let pa = this.find(a);
    let pb = this.find(b);
    if (pa === pb) return;
    if (this.rank[pa] < this.rank[pb]) {
      const swap = pa;
      pa = pb;
      pb = swap;
    }
    this.parent[pb] = pa;
    if (this.rank[pa] === this.rank[pb]) this.rank[pa] += 1;
  }
}

function uniqueExactGroups(records, { includeEmpty }) {
  const groups = new Map();
  for (const record of records) {
    if (!includeEmpty && isEmptySignature(record.fields)) continue;
    const payload = exactSignaturePayload(record.fields);
    const hash = hashPayload(payload);
    let group = groups.get(hash);
    if (!group) {
      group = {
        hash,
        payload,
        normalized: normalizedSignaturePayload(record.fields),
        fields: record.fields,
        members: [],
      };
      groups.set(hash, group);
    }
    group.members.push(record);
  }
  return [...groups.values()];
}

/**
 * Near duplicates: not byte-identical, but
 *  - identical after normalizeForNear, or
 *  - weighted field Jaccard >= threshold
 *
 * Exact-only groups are excluded (use --match exact for those).
 */
export function clusterNearDuplicates(
  records,
  { includeEmpty = false, threshold = DEFAULT_NEAR_THRESHOLD } = {},
) {
  if (!(threshold >= 0 && threshold <= 1)) {
    throw new Error("near-duplicate threshold must be between 0 and 1");
  }

  const groups = uniqueExactGroups(records, { includeEmpty });
  for (const group of groups) {
    group.tokens = fieldTokens(group.fields);
  }
  const n = groups.length;
  const uf = new UnionFind(n);
  const pairScore = new Map();

  function rememberScore(i, j, score, kind) {
    const key = i < j ? `${i}:${j}` : `${j}:${i}`;
    const prev = pairScore.get(key);
    if (!prev || score > prev.score) {
      pairScore.set(key, { score, kind });
    }
  }

  const byNormalized = new Map();
  for (let i = 0; i < n; i += 1) {
    const key = groups[i].normalized;
    const list = byNormalized.get(key);
    if (list) list.push(i);
    else byNormalized.set(key, [i]);
  }

  for (const indexes of byNormalized.values()) {
    if (indexes.length < 2) continue;
    for (let a = 0; a < indexes.length; a += 1) {
      for (let b = a + 1; b < indexes.length; b += 1) {
        const i = indexes[a];
        const j = indexes[b];
        uf.union(i, j);
        rememberScore(i, j, 1, "normalized");
      }
    }
  }

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (groups[i].normalized === groups[j].normalized) continue;
      const inhaltJ = jaccard(groups[i].tokens.inhalt, groups[j].tokens.inhalt);
      if (0.6 + 0.4 * inhaltJ + Number.EPSILON < threshold) continue;
      const score = similarityFromTokens(groups[i].tokens, groups[j].tokens);
      if (score + Number.EPSILON < threshold) continue;
      uf.union(i, j);
      rememberScore(i, j, score, "similar");
    }
  }

  const byRoot = new Map();
  for (let i = 0; i < n; i += 1) {
    const root = uf.find(i);
    const list = byRoot.get(root);
    if (list) list.push(i);
    else byRoot.set(root, [i]);
  }

  const clusters = [];
  for (const indexes of byRoot.values()) {
    if (indexes.length < 2) continue;
    const members = indexes.flatMap((i) => groups[i].members);
    if (distinctSize(members) < 2) continue;

    let minScore = 1;
    let hasSimilar = false;
    let hasNormalized = false;
    for (let a = 0; a < indexes.length; a += 1) {
      for (let b = a + 1; b < indexes.length; b += 1) {
        const i = indexes[a];
        const j = indexes[b];
        const key = i < j ? `${i}:${j}` : `${j}:${i}`;
        const stored = pairScore.get(key);
        if (!stored) continue;
        if (stored.score < minScore) minScore = stored.score;
        if (stored.kind === "similar") hasSimilar = true;
        if (stored.kind === "normalized") hasNormalized = true;
      }
    }

    const kind = hasSimilar
      ? hasNormalized
        ? "mixed"
        : "similar"
      : "normalized";

    clusters.push(
      toCluster(members, {
        signatureHash: hashPayload(indexes.map((i) => groups[i].hash).sort().join(",")),
        kind,
        minScore,
      }),
    );
  }

  return sortClusters(clusters);
}

export function clusterDuplicates(
  records,
  {
    match,
    includeEmpty = false,
    threshold = DEFAULT_NEAR_THRESHOLD,
  } = {},
) {
  if (match === "exact") {
    return clusterExactDuplicates(records, { includeEmpty });
  }
  if (match === "near") {
    return clusterNearDuplicates(records, { includeEmpty, threshold });
  }
  throw new Error(
    `Unknown match algorithm "${match}". Use one of: ${MATCH_ALGORITHMS.join(", ")}`,
  );
}

export const DUPLICATE_INDEX_VERSION = 1;

function compareModuleIds(a, b) {
  return a.localeCompare(b, "en", { numeric: true });
}

function pairKey(a, b) {
  return compareModuleIds(a, b) < 0 ? `${a}|${b}` : `${b}|${a}`;
}

function memberTitle(member, cluster) {
  return member.fields?.title ?? member.title ?? cluster.title ?? "";
}

function emptyModuleLists() {
  return { exact: [], near: [] };
}

function sortAndDedupePeers(peers) {
  const seen = new Set();
  const unique = [];
  for (const peer of peers) {
    if (seen.has(peer.moduleId)) continue;
    seen.add(peer.moduleId);
    unique.push(peer);
  }
  unique.sort((a, b) => compareModuleIds(a.moduleId, b.moduleId));
  return unique;
}

/**
 * Map exact + near clusters to the app-facing duplicates.json envelope.
 * Exact wins: a pair never appears in both lists. Arrays are A↔B symmetric.
 */
export function buildDuplicatesIndex({
  exactClusters = [],
  nearClusters = [],
  generatedAt,
  nearThreshold = DEFAULT_NEAR_THRESHOLD,
  fields = SIGNATURE_FIELDS,
} = {}) {
  const listsById = new Map();
  const exactPairs = new Set();

  function listsFor(moduleId) {
    let lists = listsById.get(moduleId);
    if (!lists) {
      lists = emptyModuleLists();
      listsById.set(moduleId, lists);
    }
    return lists;
  }

  for (const cluster of exactClusters) {
    const members = cluster.members ?? [];
    for (const from of members) {
      for (const to of members) {
        if (from.moduleId === to.moduleId) continue;
        exactPairs.add(pairKey(from.moduleId, to.moduleId));
        listsFor(from.moduleId).exact.push({
          moduleId: to.moduleId,
          title: memberTitle(to, cluster),
        });
      }
    }
  }

  for (const cluster of nearClusters) {
    const members = cluster.members ?? [];
    const nearKind =
      cluster.kind === "exact" ? "similar" : (cluster.kind ?? "similar");
    const score = cluster.minScore ?? 1;
    for (const from of members) {
      for (const to of members) {
        if (from.moduleId === to.moduleId) continue;
        if (exactPairs.has(pairKey(from.moduleId, to.moduleId))) continue;
        listsFor(from.moduleId).near.push({
          moduleId: to.moduleId,
          title: memberTitle(to, cluster),
          score,
          nearKind,
        });
      }
    }
  }

  const modules = {};
  for (const [moduleId, lists] of listsById.entries()) {
    const exact = sortAndDedupePeers(lists.exact);
    const near = sortAndDedupePeers(lists.near).filter(
      (peer) => !exact.some((e) => e.moduleId === peer.moduleId),
    );
    if (exact.length === 0 && near.length === 0) continue;
    const entry = {};
    if (exact.length > 0) entry.exact = exact;
    if (near.length > 0) entry.near = near;
    modules[moduleId] = entry;
  }

  assertDuplicatesIndexSymmetry(modules);

  return {
    version: DUPLICATE_INDEX_VERSION,
    generatedAt,
    fields: [...fields],
    nearThreshold,
    modules,
  };
}

export function assertDuplicatesIndexSymmetry(modules) {
  for (const [moduleId, entry] of Object.entries(modules)) {
    const exactIds = (entry.exact ?? []).map((p) => p.moduleId);
    const nearIds = (entry.near ?? []).map((p) => p.moduleId);
    const overlap = exactIds.filter((id) => nearIds.includes(id));
    if (overlap.length > 0) {
      throw new Error(
        `Peer ${overlap[0]} listed as both exact and near for ${moduleId}`,
      );
    }
    if (exactIds.includes(moduleId) || nearIds.includes(moduleId)) {
      throw new Error(`Self-entry for ${moduleId}`);
    }
    for (const peerId of exactIds) {
      const reverse = modules[peerId]?.exact ?? [];
      if (!reverse.some((p) => p.moduleId === moduleId)) {
        throw new Error(`Exact list is not symmetric: ${moduleId} ↔ ${peerId}`);
      }
    }
    for (const peerId of nearIds) {
      const reverse = modules[peerId]?.near ?? [];
      if (!reverse.some((p) => p.moduleId === moduleId)) {
        throw new Error(`Near list is not symmetric: ${moduleId} ↔ ${peerId}`);
      }
    }
  }
}
