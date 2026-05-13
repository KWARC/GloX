import { ExtractedItem } from "@/server/text-selection";
import {
  CatalogEntry,
  DefinitionCatalogSource,
  SymbolicIndex,
  SymbolicOccurrence,
} from "@/types/symbolic.types";
import { FtmlContent, FtmlNode, normalizeToRoot } from "@/types/ftml.types";

type PageText = {
  id: string;
  text: string;
};

function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSurface(value: string): string {
  return value.toLowerCase().trim();
}

function collectInlineText(content: FtmlContent[] | undefined): string {
  if (!content) return "";

  return content
    .map((item) => {
      if (typeof item === "string") return item;
      return collectInlineText(item.content);
    })
    .join("");
}

function walkNodes(node: FtmlNode, visit: (node: FtmlNode) => void) {
  visit(node);

  for (const child of node.content ?? []) {
    if (typeof child !== "string") walkNodes(child, visit);
  }
}

function uniqueTerms(values: string[]): string[] {
  return [...new Set(values.map(normalizeSurface).filter(Boolean))];
}

function getDefinitionTerms(definition: ExtractedItem): string[] {
  const root = normalizeToRoot(definition.statement);
  const terms: string[] = [];

  for (const node of root.content) {
    if (node.type === "definition") {
      terms.push(...(node.for_symbols ?? []));
    }

    walkNodes(node, (current) => {
      if (current.type !== "definiendum") return;

      if (current.uri) terms.push(current.uri);

      const label = collectInlineText(current.content);
      if (label) terms.push(label);
    });
  }

  if (definition.fileName) terms.push(definition.fileName);

  return uniqueTerms(terms);
}

export function buildDefinitionCatalog(
  definitions: ExtractedItem[],
): DefinitionCatalogSource[] {
  return definitions.map((definition) => {
    const terms = getDefinitionTerms(definition);
    const firstTerm = terms[0] ?? definition.fileName ?? definition.id;
    const symbolicUri = firstTerm;

    return {
      id: definition.id,
      name: firstTerm,
      canonicalForm: normalizeTerm(firstTerm),
      aliases: terms.filter((term) => term !== firstTerm),
      symbolicUri,
    };
  });
}

export function buildCatalogEntries(
  catalog: DefinitionCatalogSource[],
): CatalogEntry[] {
  return catalog.map((definition) => ({
    definitionId: definition.id,
    terms: uniqueTerms([
      definition.canonicalForm,
      definition.name,
      definition.symbolicUri,
      ...definition.aliases,
    ]),
  }));
}

export function findMatches(
  text: string,
  pageId: string,
  entry: CatalogEntry,
): SymbolicOccurrence[] {
  const matches: SymbolicOccurrence[] = [];
  const normalizedText = text.toLowerCase();

  for (const term of entry.terms) {
    let index = 0;
    const normalizedTerm = term.toLowerCase();
    if (!normalizedTerm) continue;

    while ((index = normalizedText.indexOf(normalizedTerm, index)) !== -1) {
      matches.push({
        definitionId: entry.definitionId,
        pageId,
        startOffset: index,
        endOffset: index + normalizedTerm.length,
        matchedText: text.slice(index, index + normalizedTerm.length),
        confidence: 1,
      });
      index += normalizedTerm.length;
    }
  }

  return matches;
}

export function resolveSymbolicOccurrenceConflicts(
  occurrences: SymbolicOccurrence[],
): SymbolicOccurrence[] {
  return [...occurrences]
    .sort((a, b) => {
      const aLength = a.endOffset - a.startOffset;
      const bLength = b.endOffset - b.startOffset;
      if (aLength !== bLength) return bLength - aLength;
      if (a.confidence !== b.confidence) return b.confidence - a.confidence;
      return a.startOffset - b.startOffset;
    })
    .reduce<SymbolicOccurrence[]>((accepted, occurrence) => {
      const overlaps = accepted.some(
        (existing) =>
          occurrence.startOffset < existing.endOffset &&
          existing.startOffset < occurrence.endOffset,
      );

      if (!overlaps) accepted.push(occurrence);
      return accepted;
    }, [])
    .sort((a, b) => a.startOffset - b.startOffset);
}

export function buildSymbolicIndex(
  pages: PageText[],
  entries: CatalogEntry[],
): SymbolicIndex {
  const index: SymbolicIndex = {};

  for (const page of pages) {
    const occurrences = entries.flatMap((entry) =>
      findMatches(page.text, page.id, entry),
    );
    index[page.id] = resolveSymbolicOccurrenceConflicts(occurrences);
  }

  return index;
}
