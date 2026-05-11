import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { parseUri } from "@/server/parseUri";
import type { ExtractedItem } from "@/server/text-selection";
import {
  normalizeToRoot,
} from "@/types/ftml.types";
import type {
  FtmlContent,
  FtmlNode,
  FtmlStatement,
} from "@/types/ftml.types";
import {
  Catalog,
  stringToStemmedWordSequenceSimplified,
  Verbalization,
} from "./symbolic-catalog/catalogSearch";
import type { StaticCatalogDef } from "./symbolic-catalog/loadCatalog";

type CatalogEntry = {
  id: string;
  name: string;
  canonicalForm: string;
  aliases: string[];
  symbolicUri: string;
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

const SEMANTIC_TYPES = new Set(["symref", "definiendum", "definiens"]);

function isSurfaceTerm(term: string) {
  return term && !term.includes("/") && !term.includes(":") && term.length < 80;
}

function normalizeMatch(v: string) {
  return v
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(v: string) {
  return stringToStemmedWordSequenceSimplified(normalizeMatch(v)).filter(
    (token) => token.length > 1,
  );
}

function candidateKey(candidate: SuggestedReferenceCandidate) {
  return [
    candidate.source,
    candidate.definitionId ?? "",
    candidate.uri ?? "",
    candidate.label,
  ].join("::");
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
      cursor = walkTextNodes(child, visit, nextInsideSemantic, cursor, childPath);
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

function getCandidateConfidence(term: string, entry: CatalogEntry): number {
  const normalizedTerm = normalizeMatch(term);
  const names = [entry.name, ...entry.aliases].filter(isSurfaceTerm);
  const exactAlias = entry.aliases.some(
    (alias) => alias.toLowerCase() === term.toLowerCase(),
  );
  const exactName = entry.name.toLowerCase() === term.toLowerCase();

  if (exactAlias || exactName) return exactAlias ? 1 : 0.98;

  if (names.some((name) => normalizeMatch(name) === normalizedTerm)) {
    return 0.9;
  }

  const termTokens = new Set(tokenize(term));
  if (termTokens.size === 0) return 0;

  let best = 0;
  for (const name of names) {
    const normalizedName = normalizeMatch(name);
    if (!normalizedName) continue;

    if (
      normalizedName.includes(normalizedTerm) ||
      normalizedTerm.includes(normalizedName)
    ) {
      best = Math.max(best, 0.72);
    }

    const nameTokens = tokenize(name);
    const overlap = nameTokens.filter((token) => termTokens.has(token)).length;
    if (overlap > 0) {
      best = Math.max(best, 0.5 + overlap / Math.max(nameTokens.length, 1) * 0.2);
    }
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
    ].filter(Boolean).join("/"),
    confidence,
    definitionId: entry.sourceDefinitionId,
  };
}

function formatMathHubPath(parsed: ReturnType<typeof parseUri>) {
  return [
    parsed.archive,
    parsed.filePath,
    parsed.fileName,
    parsed.language,
  ].filter(Boolean).join("/");
}

function getRankedCandidates(
  term: string,
  definition: ExtractedItem,
  entries: CatalogEntry[],
) {
  return entries
    .filter((entry) => entry.sourceDefinitionId !== definition.id)
    .map((entry) => ({
      entry,
      confidence: getCandidateConfidence(term, entry),
    }))
    .filter(({ confidence }) => confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
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

    for (const term of [entry.name, ...entry.aliases].filter(isSurfaceTerm)) {
      suggestionCatalog.addSymbVerb(entry, new Verbalization(term));
    }
  }

  return suggestionCatalog;
}

function findAllCatalogMatches(
  catalog: Catalog<CatalogEntry, Verbalization>,
  text: string,
) {
  const matches: Array<{
    start: number;
    end: number;
    text: string;
    entries: CatalogEntry[];
  }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const match = catalog.findFirstMatch(text.slice(cursor));
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

export function buildDefinitionCatalog(extracts: ExtractedItem[]): CatalogEntry[] {
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
  const staticDefs = staticCatalog.map((d): CatalogEntry => ({
    id: d.id,
    name: d.name,
    canonicalForm: d.name.toLowerCase(),
    aliases: d.aliases,
    symbolicUri: d.symbolicUri,
    symRef: {
      source: "MATHHUB",
      uri: d.symbolicUri,
    },
  }));

  return [...dynamic, ...staticDefs];
}

export function suggestRefsForDefinition(
  definition: ExtractedItem,
  catalog: CatalogEntry[],
): SuggestedReferenceSession {
  const root = normalizeToRoot(definition.statement);
  const definitionText = extractPlainText(definition.statement);
  const out: SuggestedReference[] = [];
  const candidateSymRefs: Record<string, UnifiedSymbolicReference> = {};
  const suggestionCatalog = buildSuggestionCatalog(definition, catalog);

  walkTextNodes(root, (textNode, plainOffset, nodePath) => {
    for (const match of findAllCatalogMatches(suggestionCatalog, textNode)) {
      const ranked = getRankedCandidates(match.text, definition, match.entries);
      const candidates = ranked.map(({ entry: target, confidence }) => {
        const candidate = toCandidate(target, confidence);
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
