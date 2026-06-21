export function isSurfaceTerm(term: string) {
  return term && !term.includes("/") && !term.includes(":") && term.length < 80;
}
function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenizeSearchValue(value: string) {
  return normalizeSearchValue(value).split(" ").filter(Boolean);
}

function acronym(value: string) {
  return tokenizeSearchValue(value)
    .map((token) => token[0])
    .join("");
}

function tokenPrefixMatch(queryTokens: string[], targetTokens: string[]) {
  if (!queryTokens.length || queryTokens.length > targetTokens.length) {
    return false;
  }

  return queryTokens.every((queryToken, index) => {
    const targetToken = targetTokens[index];
    return (
      targetToken?.startsWith(queryToken) || queryToken.startsWith(targetToken)
    );
  });
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function characterDiceCoefficient(a: string, b: string) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramCounts = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bigram = a.slice(i, i + 2);
    bigramCounts.set(bigram, (bigramCounts.get(bigram) ?? 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bigram = b.slice(i, i + 2);
    const count = bigramCounts.get(bigram) ?? 0;
    if (count > 0) {
      intersection += 1;
      bigramCounts.set(bigram, count - 1);
    }
  }

  return (2 * intersection) / (a.length + b.length - 2);
}

function tokenDiceCoefficient(queryTokens: string[], targetTokens: string[]) {
  if (!queryTokens.length || !targetTokens.length) return 0;

  const targetSet = new Set(targetTokens);
  const overlap = queryTokens.filter(
    (token) =>
      targetSet.has(token) ||
      targetTokens.some((target) => target.startsWith(token)),
  ).length;

  return (2 * overlap) / (queryTokens.length + targetTokens.length);
}

function fuzzyScore(query: string, target: string) {
  const queryTokens = tokenizeSearchValue(query);
  const targetTokens = tokenizeSearchValue(target);
  const normalizedQuery = queryTokens.join(" ");
  const normalizedTarget = targetTokens.join(" ");
  if (!normalizedQuery || !normalizedTarget) return 0;

  const maxLength = Math.max(normalizedQuery.length, normalizedTarget.length);
  const editSimilarity =
    maxLength === 0
      ? 0
      : 1 - levenshteinDistance(normalizedQuery, normalizedTarget) / maxLength;
  const charSimilarity = characterDiceCoefficient(
    normalizedQuery,
    normalizedTarget,
  );
  const tokenSimilarity = tokenDiceCoefficient(queryTokens, targetTokens);

  return Math.max(editSimilarity, charSimilarity, tokenSimilarity);
}

export function scoreCandidate(
  query: string,
  candidateTerms: string[],
): number {
  const normalizedQuery = normalizeSearchValue(query);
  const queryTokens = tokenizeSearchValue(query);
  if (!normalizedQuery || !queryTokens.length) return 0;

  let best = 0;
  for (const term of candidateTerms.filter(isSurfaceTerm)) {
    const normalizedTerm = normalizeSearchValue(term);
    if (!normalizedTerm) continue;

    if (normalizedTerm === normalizedQuery) {
      best = Math.max(best, 1);
      continue;
    }

    if (normalizedTerm.startsWith(normalizedQuery)) {
      best = Math.max(best, 0.92);
      continue;
    }

    if (acronym(normalizedTerm) === normalizedQuery) {
      best = Math.max(best, 0.88);
      continue;
    }

    if (tokenPrefixMatch(queryTokens, tokenizeSearchValue(normalizedTerm))) {
      best = Math.max(best, 0.82);
      continue;
    }

    if (normalizedTerm.includes(normalizedQuery)) {
      best = Math.max(best, 0.72);
      continue;
    }

    best = Math.max(best, fuzzyScore(normalizedQuery, normalizedTerm));
  }

  return best;
}
