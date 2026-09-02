export function duplicateOfLabel(canonicalModuleId: string): string {
  return `Duplicate of ${canonicalModuleId}`;
}

export const MAX_LISTED_DUPLICATE_PEERS = 8;

function compareModuleIds(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true });
}

type ListablePeer = {
  moduleId: string;
  duplicateOfModuleId?: string | null;
};

/** Extracted peers first, then numeric id. Exact and near are merged for the id list. */
export function listedDuplicatePeers(
  exact: readonly ListablePeer[],
  near: readonly ListablePeer[],
  extractedIds: ReadonlySet<string>,
): Array<{
  moduleId: string;
  extracted: boolean;
  duplicateOfModuleId: string | null;
}> {
  const seen = new Set<string>();
  const peers: Array<{
    moduleId: string;
    extracted: boolean;
    duplicateOfModuleId: string | null;
  }> = [];
  for (const peer of [...exact, ...near]) {
    if (seen.has(peer.moduleId)) continue;
    seen.add(peer.moduleId);
    peers.push({
      moduleId: peer.moduleId,
      extracted: extractedIds.has(peer.moduleId),
      duplicateOfModuleId: peer.duplicateOfModuleId ?? null,
    });
  }
  peers.sort((a, b) => {
    if (a.extracted !== b.extracted) return a.extracted ? -1 : 1;
    return compareModuleIds(a.moduleId, b.moduleId);
  });
  return peers;
}

export function formatDuplicateCountLabel(
  exactCount: number,
  nearCount: number,
): string | null {
  const parts: string[] = [];
  if (exactCount > 0) parts.push(`${exactCount} exact`);
  if (nearCount > 0) parts.push(`${nearCount} near`);
  if (parts.length === 0) return null;
  return `Duplicates: ${parts.join(", ")}`;
}

type MarkTargetPeer = {
  moduleId: string;
  extracted?: boolean;
  duplicateOfModuleId?: string | null;
};

function isEligibleMarkTarget(peer: MarkTargetPeer): boolean {
  return Boolean(peer.extracted) && !peer.duplicateOfModuleId;
}

/** Persisted peers that are not themselves aliases — valid mark originals (T1). */
export function eligibleMarkTargetIds(
  exact: readonly MarkTargetPeer[],
  near: readonly MarkTargetPeer[],
): { exact: string[]; near: string[] } {
  const collect = (peers: readonly MarkTargetPeer[]) =>
    [
      ...new Set(
        peers.filter(isEligibleMarkTarget).map((peer) => peer.moduleId),
      ),
    ].sort(compareModuleIds);
  return { exact: collect(exact), near: collect(near) };
}

export function pickMarkCanonicalId(
  exactIds: readonly string[],
  nearIds: readonly string[],
): string | null {
  return exactIds[0] ?? nearIds[0] ?? null;
}
