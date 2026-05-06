import type { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import type { ExtractedItem } from "@/server/text-selection";
import {
  normalizeToRoot,
} from "@/types/ftml.types";
import type {
  FtmlContent,
  FtmlNode,
  FtmlStatement,
} from "@/types/ftml.types";
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

export type SuggestedRef = {
  text: string;
  startOffset: number;
  endOffset: number;
  plainStartOffset: number;
  plainEndOffset: number;
  targetDefinitionId: string;
  targetName: string;
  confidence: number;
  symRef: UnifiedSymbolicReference;
};

const SEMANTIC_TYPES = new Set(["symref", "definiendum", "definiens"]);

function escapeRegExp(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isSurfaceTerm(term: string) {
  return term && !term.includes("/") && !term.includes(":") && term.length < 80;
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
  visit: (text: string, plainOffset: number) => void,
  insideSemantic = false,
  plainOffset = 0,
): number {
  let cursor = plainOffset;
  const nextInsideSemantic = insideSemantic || SEMANTIC_TYPES.has(node.type);

  for (const child of node.content ?? []) {
    if (typeof child === "string") {
      if (!nextInsideSemantic) visit(child, cursor);
      cursor += child.length;
    } else {
      cursor = walkTextNodes(child, visit, nextInsideSemantic, cursor);
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

function resolveConflicts(input: SuggestedRef[]): SuggestedRef[] {
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
    .reduce<SuggestedRef[]>((acc, cur) => {
      const overlap = acc.some(
        (e) =>
          cur.plainStartOffset < e.plainEndOffset &&
          e.plainStartOffset < cur.plainEndOffset,
      );
      if (!overlap) acc.push(cur);
      return acc;
    }, []);
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
): SuggestedRef[] {
  const root = normalizeToRoot(definition.statement);
  const out: SuggestedRef[] = [];

  for (const entry of catalog) {
    if (entry.sourceDefinitionId === definition.id) continue;

    const terms = [entry.name, ...entry.aliases].filter(isSurfaceTerm);
    if (!terms.length) continue;

    walkTextNodes(root, (textNode, plainOffset) => {
      for (const term of terms) {
        const re = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
        let m: RegExpExecArray | null;

        while ((m = re.exec(textNode)) !== null) {
          out.push({
            text: m[0],
            startOffset: m.index,
            endOffset: m.index + m[0].length,
            plainStartOffset: plainOffset + m.index,
            plainEndOffset: plainOffset + m.index + m[0].length,
            targetDefinitionId: entry.id,
            targetName: entry.name,
            confidence: 1,
            symRef: entry.symRef,
          });
        }
      }
    });
  }

  return resolveConflicts(out);
}
