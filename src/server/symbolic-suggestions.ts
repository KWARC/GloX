import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { parseUri } from "@/server/parseUri";
import type { ExtractedItem } from "@/server/text-selection";
import type { FtmlContent, FtmlNode, FtmlStatement } from "@/types/ftml.types";
import { normalizeToRoot } from "@/types/ftml.types";
import {
  Catalog,
  stringToStemmedWordSequenceSimplified,
  Verbalization,
} from "./symbolic-catalog/catalogSearch";
import type { StaticCatalogDef } from "./symbolic-catalog/loadCatalog";

export type CatalogEntry = {
  id: string;
  name: string;
  canonicalForm: string;
  aliases: string[];
  symbolicUri: string;
  language?: string;
  sourceDefinitionId?: string;
  symRef: UnifiedSymbolicReference;
};

export type SuggestedReferenceCandidate = {
  source: "DB" | "MATHHUB";
  label: string;
  path?: string;
  confidence: number;
  definitionId?: string;
  uri?: string;
};

export type SuggestedReference = {
  text: string;
  context: string;
  nodePath: number[];
  localStartOffset: number;
  localEndOffset: number;
  plainStartOffset: number;
  plainEndOffset: number;
  candidates: SuggestedReferenceCandidate[];
};

export type SuggestedReferenceSession = {
  suggestions: SuggestedReference[];
  candidateSymRefs: Record<string, UnifiedSymbolicReference>;
};

export type SuggestionIgnoreOptions = {
  stemsToIgnore?: Set<string>;
  wordsToIgnore?: Set<string>;
  symbolsToIgnore?: Set<string>;
};

const DEFAULT_AUTOMATIC_IGNORED_SINGLE_TOKENS: Record<string, Set<string>> = {
  en: new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "being",
    "but",
    "by",
    "for",
    "from",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "not",
    "of",
    "on",
    "or",
    "than",
    "that",
    "the",
    "then",
    "these",
    "this",
    "those",
    "to",
    "was",
    "were",
    "with",
  ]),
};

export function isEligibleForAutomaticSuggestion(
  term: string,
  language: string,
) {
  const tokens = stringToStemmedWordSequenceSimplified(term, language);
  if (tokens.length === 0) return false;
  if (tokens.length !== 1) return true;

  const surface = (term.match(/[\p{L}\p{N}_]+/gu) ?? [])[0] ?? "";
  if (Array.from(surface).length <= 1) return false;

  return !DEFAULT_AUTOMATIC_IGNORED_SINGLE_TOKENS[language]?.has(
    surface.toLowerCase(),
  );
}

const SEMANTIC_TYPES = new Set(["symref", "definiendum", "definiens"]);

function isSurfaceTerm(term: string) {
  return term && !term.includes("/") && !term.includes(":") && term.length < 80;
}

function candidateKey(candidate: SuggestedReferenceCandidate) {
  if (candidate.source === "DB") {
    return `DB:${candidate.definitionId ?? ""}`;
  }
  return `MATHHUB:${candidate.uri ?? ""}`;
}

export function getSuggestedReferenceCandidateKey(
  candidate: SuggestedReferenceCandidate,
) {
  return candidateKey(candidate);
}

function getStringContent(content: FtmlContent[] | undefined): string {
  return (content ?? [])
    .map((c) => (typeof c === "string" ? c : getStringContent(c.content)))
    .join("");
}

function walkPlainText(node: FtmlNode): string {
  return (node.content ?? [])
    .map((c) => (typeof c === "string" ? c : walkPlainText(c)))
    .join("");
}

export function extractPlainText(statement: FtmlStatement): string {
  const root = normalizeToRoot(statement);
  return walkPlainText(root);
}

function walkTextNodes(
  node: FtmlNode,
  visit: (text: string, plainOffset: number, nodePath: number[]) => void,
  insideSemantic = false,
  plainOffset = 0,
  path: number[] = [],
): number {
  let cursor = plainOffset;
  const nextInsideSemantic = insideSemantic || SEMANTIC_TYPES.has(node.type);

  const content = node.content ?? [];
  for (let i = 0; i < content.length; i++) {
    const child = content[i];
    const childPath = [...path, i];

    if (typeof child === "string") {
      if (!nextInsideSemantic) visit(child, cursor, childPath);
      cursor += child.length;
    } else {
      cursor = walkTextNodes(
        child,
        visit,
        nextInsideSemantic,
        cursor,
        childPath,
      );
    }
  }

  return cursor;
}

function isDeclaredDefiniendum(
  node: FtmlNode,
): node is FtmlNode & { type: "definiendum"; symdecl: true; uri: string } {
  const candidate = node as FtmlNode & { symdecl?: unknown };
  return (
    candidate.type === "definiendum" &&
    candidate.symdecl === true &&
    !!candidate.uri
  );
}

function walkNodes(node: FtmlNode, visit: (node: FtmlNode) => void) {
  visit(node);

  for (const child of node.content ?? []) {
    if (typeof child !== "string") walkNodes(child, visit);
  }
}

function resolveConflicts(input: SuggestedReference[]): SuggestedReference[] {
  return [...input]
    .sort((a, b) => {
      if (a.plainStartOffset !== b.plainStartOffset) {
        return a.plainStartOffset - b.plainStartOffset;
      }
      return (
        b.plainEndOffset -
        b.plainStartOffset -
        (a.plainEndOffset - a.plainStartOffset)
      );
    })
    .reduce<SuggestedReference[]>((acc, cur) => {
      const overlap = acc.some(
        (e) =>
          cur.plainStartOffset < e.plainEndOffset &&
          e.plainStartOffset < cur.plainEndOffset,
      );
      if (!overlap) acc.push(cur);
      return acc;
    }, []);
}

function buildContext(text: string, start: number, end: number) {
  const w = 80;
  return text.slice(Math.max(0, start - w), Math.min(text.length, end + w));
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

function toCandidate(
  entry: CatalogEntry,
  confidence: number,
): SuggestedReferenceCandidate {
  if (entry.symRef.source === "MATHHUB") {
    const parsed = parseUri(entry.symRef.uri);
    return {
      source: "MATHHUB",
      label: entry.name,
      path: formatMathHubPath(parsed),
      confidence,
      uri: entry.symRef.uri,
    };
  }

  return {
    source: "DB",
    label: entry.name,
    path: [
      entry.symRef.futureRepo,
      entry.symRef.filePath,
      entry.symRef.fileName,
      entry.symRef.language,
    ]
      .filter(Boolean)
      .join("/"),
    confidence,
    definitionId: entry.sourceDefinitionId,
  };
}

function formatMathHubPath(parsed: ReturnType<typeof parseUri>) {
  return [parsed.archive, parsed.filePath, parsed.fileName, parsed.language]
    .filter(Boolean)
    .join("/");
}

function getSearchTerms(entry: CatalogEntry) {
  return [entry.name, ...entry.aliases].filter(isSurfaceTerm);
}

export function buildCandidateSymRefMap(
  catalog: CatalogEntry[],
  currentDefinitionId?: string,
): Record<string, UnifiedSymbolicReference> {
  const candidateSymRefs: Record<string, UnifiedSymbolicReference> = {};

  for (const entry of catalog) {
    if (
      entry.symRef.source === "DB" &&
      entry.sourceDefinitionId === currentDefinitionId
    ) {
      continue;
    }

    const candidate = toCandidate(entry, 1);
    candidateSymRefs[getSuggestedReferenceCandidateKey(candidate)] =
      entry.symRef;
  }

  return candidateSymRefs;
}

export function searchReferenceCandidates(
  query: string,
  catalog: CatalogEntry[],
  currentDefinitionId?: string,
): SuggestedReferenceCandidate[] {
  const seen = new Set<string>();

  return catalog
    .flatMap((entry) => {
      if (
        entry.symRef.source === "DB" &&
        entry.sourceDefinitionId === currentDefinitionId
      ) {
        return [];
      }

      const terms = getSearchTerms(entry);
      if (!terms.length) return [];

      const score = scoreCandidate(query, terms);
      if (score < 0.5) return [];

      const candidate = toCandidate(entry, score);
      const key = getSuggestedReferenceCandidateKey(candidate);
      if (seen.has(key)) return [];
      seen.add(key);

      return [{ candidate, score }];
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.candidate.label.localeCompare(b.candidate.label),
    )
    .slice(0, 10)
    .map(({ candidate }) => candidate);
}

function getRankedCandidates(
  entries: CatalogEntry[],
  catalog: Catalog<CatalogEntry, Verbalization>,
) {
  return [...entries].sort((a, b) => {
    const usageDifference =
      catalog.getSymbVerbs(b).length - catalog.getSymbVerbs(a).length;
    if (usageDifference !== 0) return usageDifference;
    return a.symbolicUri < b.symbolicUri
      ? -1
      : a.symbolicUri > b.symbolicUri
        ? 1
        : 0;
  });
}

function buildSuggestionCatalog(
  definition: ExtractedItem,
  catalog: CatalogEntry[],
) {
  const suggestionCatalog = new Catalog<CatalogEntry, Verbalization>(
    definition.language,
    (entry) => entry.id,
  );

  for (const entry of catalog) {
    if (entry.sourceDefinitionId === definition.id) continue;
    if (entry.language !== definition.language) continue;

    for (const term of [entry.name, ...entry.aliases]) {
      if (!isEligibleForAutomaticSuggestion(term, definition.language)) {
        continue;
      }
      suggestionCatalog.addSymbVerb(entry, new Verbalization(term));
    }
  }

  return suggestionCatalog;
}

function findAllCatalogMatches(
  catalog: Catalog<CatalogEntry, Verbalization>,
  text: string,
  ignoreOptions: SuggestionIgnoreOptions,
) {
  const matches: Array<{
    start: number;
    end: number;
    text: string;
    entries: CatalogEntry[];
  }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const match = catalog.findFirstMatch(text.slice(cursor), ignoreOptions);
    if (!match) break;

    const start = cursor + match.start;
    const end = cursor + match.end;
    matches.push({
      start,
      end,
      text: text.slice(start, end),
      entries: match.candidates.map(([entry]) => entry),
    });

    cursor += Math.max(match.end, match.start + 1);
  }

  return matches;
}

export function buildDefinitionCatalog(
  extracts: ExtractedItem[],
): CatalogEntry[] {
  return extracts.flatMap((extract) => {
    const root = normalizeToRoot(extract.statement);
    const entries: CatalogEntry[] = [];

    walkNodes(root, (node) => {
      if (!isDeclaredDefiniendum(node)) return;

      const name = getStringContent(node.content).trim() || node.uri;
      if (!name) return;

      entries.push({
        id: node.uri,
        name,
        canonicalForm: name.toLowerCase(),
        aliases: node.uri === name ? [] : [node.uri],
        symbolicUri: node.uri,
        language: extract.language,
        sourceDefinitionId: extract.id,
        symRef: {
          source: "DB",
          symbolName: node.uri,
          futureRepo: extract.futureRepo,
          filePath: extract.filePath,
          fileName: extract.fileName,
          language: extract.language,
        },
      });
    });

    return entries;
  });
}

export function buildFullCatalog(
  extracts: ExtractedItem[],
  staticCatalog: StaticCatalogDef[],
): CatalogEntry[] {
  const dynamic = buildDefinitionCatalog(extracts);
  const staticDefs = buildStaticCatalog(staticCatalog);

  return [...dynamic, ...staticDefs];
}

export function buildStaticCatalog(
  staticCatalog: StaticCatalogDef[],
): CatalogEntry[] {
  return staticCatalog.map(
    (d): CatalogEntry => ({
      id: d.id,
      name: d.name,
      canonicalForm: d.name.toLowerCase(),
      aliases: d.aliases,
      symbolicUri: d.symbolicUri,
      language: d.language,
      symRef: {
        source: "MATHHUB",
        uri: d.symbolicUri,
      },
    }),
  );
}

export function suggestRefsForDefinition(
  definition: ExtractedItem,
  catalog: CatalogEntry[],
  ignoreOptions: SuggestionIgnoreOptions = {},
): SuggestedReferenceSession {
  const root = normalizeToRoot(definition.statement);
  const definitionText = extractPlainText(definition.statement);
  const out: SuggestedReference[] = [];
  const candidateSymRefs: Record<string, UnifiedSymbolicReference> = {};
  const suggestionCatalog = buildSuggestionCatalog(definition, catalog);

  walkTextNodes(root, (textNode, plainOffset, nodePath) => {
    for (const match of findAllCatalogMatches(
      suggestionCatalog,
      textNode,
      ignoreOptions,
    )) {
      const ranked = getRankedCandidates(match.entries, suggestionCatalog);
      const candidates = ranked.map((target) => {
        const candidate = toCandidate(target, 1);
        candidateSymRefs[candidateKey(candidate)] = target.symRef;
        return candidate;
      });

      if (!candidates.length) continue;

      const plainStartOffset = plainOffset + match.start;
      const plainEndOffset = plainOffset + match.end;

      out.push({
        text: match.text,
        context: buildContext(definitionText, plainStartOffset, plainEndOffset),
        nodePath,
        localStartOffset: match.start,
        localEndOffset: match.end,
        plainStartOffset,
        plainEndOffset,
        candidates,
      });
    }
  });

  return {
    suggestions: resolveConflicts(out),
    candidateSymRefs,
  };
}
