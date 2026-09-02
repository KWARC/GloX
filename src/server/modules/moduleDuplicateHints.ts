export type DuplicateExactPeer = {
  moduleId: string;
  title: string;
};

export type DuplicateNearPeer = DuplicateExactPeer & {
  score: number;
  nearKind: "normalized" | "similar" | "mixed";
};

export type DuplicateIndexEntry = {
  exact?: DuplicateExactPeer[];
  near?: DuplicateNearPeer[];
};

export type CatalogDuplicatesIndex = {
  version: number;
  generatedAt?: string;
  fields?: string[];
  nearThreshold?: number;
  modules: Record<string, DuplicateIndexEntry>;
};

export type C2Suggestion = {
  moduleId: string;
  title: string;
  match: "exact" | "near";
  extracted: boolean;
};

export type DuplicatePeerRef = {
  moduleId: string;
  title: string;
  extracted: boolean;
  duplicateOfModuleId: string | null;
};

export type DuplicateSearchHint = {
  exact: DuplicatePeerRef[];
  near: Array<DuplicatePeerRef & { score: number; nearKind: "normalized" | "similar" | "mixed" }>;
  suggestion: C2Suggestion | null;
  otherPeerCount: number;
};

function withPeerStatus<T extends { moduleId: string }>(
  peers: readonly T[],
  extractedIds: ReadonlySet<string>,
  duplicateOfByModuleId: ReadonlyMap<string, string | null>,
): Array<T & { extracted: boolean; duplicateOfModuleId: string | null }> {
  return peers.map((peer) => ({
    ...peer,
    extracted: extractedIds.has(peer.moduleId),
    duplicateOfModuleId: duplicateOfByModuleId.get(peer.moduleId) ?? null,
  }));
}

function compareModuleIds(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true });
}

function lowestId<T extends { moduleId: string }>(peers: T[]): T | undefined {
  if (peers.length === 0) return undefined;
  return [...peers].sort((a, b) => compareModuleIds(a.moduleId, b.moduleId))[0];
}

/** C2: extracted exact, else extracted near, else lowest exact, else lowest near. */
export function pickC2Suggestion(
  exact: readonly DuplicateExactPeer[],
  near: readonly DuplicateNearPeer[],
  extractedIds: ReadonlySet<string>,
): C2Suggestion | null {
  const exactExtracted = exact.filter((peer) => extractedIds.has(peer.moduleId));
  const pickedExactExtracted = lowestId(exactExtracted);
  if (pickedExactExtracted) {
    return {
      moduleId: pickedExactExtracted.moduleId,
      title: pickedExactExtracted.title,
      match: "exact",
      extracted: true,
    };
  }

  const nearExtracted = near.filter((peer) => extractedIds.has(peer.moduleId));
  const pickedNearExtracted = lowestId(nearExtracted);
  if (pickedNearExtracted) {
    return {
      moduleId: pickedNearExtracted.moduleId,
      title: pickedNearExtracted.title,
      match: "near",
      extracted: true,
    };
  }

  const pickedExact = lowestId([...exact]);
  if (pickedExact) {
    return {
      moduleId: pickedExact.moduleId,
      title: pickedExact.title,
      match: "exact",
      extracted: false,
    };
  }

  const pickedNear = lowestId([...near]);
  if (pickedNear) {
    return {
      moduleId: pickedNear.moduleId,
      title: pickedNear.title,
      match: "near",
      extracted: false,
    };
  }

  return null;
}

export function duplicateHintForModule(
  moduleId: string,
  index: CatalogDuplicatesIndex | null,
  extractedIds: ReadonlySet<string>,
  duplicateOfByModuleId: ReadonlyMap<string, string | null> = new Map(),
): DuplicateSearchHint | null {
  const entry = index?.modules[moduleId];
  const exact = entry?.exact ?? [];
  const near = entry?.near ?? [];
  if (exact.length === 0 && near.length === 0) return null;

  const suggestion = pickC2Suggestion(exact, near, extractedIds);
  const otherPeerCount = Math.max(0, exact.length + near.length - 1);
  return {
    exact: withPeerStatus(exact, extractedIds, duplicateOfByModuleId),
    near: withPeerStatus(near, extractedIds, duplicateOfByModuleId),
    suggestion,
    otherPeerCount,
  };
}

export function attachDuplicateHints<T extends { moduleId: string }>(
  hits: readonly T[],
  index: CatalogDuplicatesIndex | null,
  extractedIds: ReadonlySet<string>,
  duplicateOfByModuleId: ReadonlyMap<string, string | null> = new Map(),
): Array<T & { duplicateHint: DuplicateSearchHint | null }> {
  return hits.map((hit) => ({
    ...hit,
    duplicateHint: duplicateHintForModule(
      hit.moduleId,
      index,
      extractedIds,
      duplicateOfByModuleId,
    ),
  }));
}
