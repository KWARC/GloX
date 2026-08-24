import { initFloDown } from "@/lib/flodownClient";
import {
  createFloDownDocumentFromGlox,
  symbolUriFromGlox,
} from "@/lib/flodownUris";
import { parseUri } from "@/server/parseUri";
import { isHttp } from "@/server/ftml/generateStexFromFtml";
// Remaining issue: isHttp is re-exported from generateStexFromFtml; the definition lives in
// statementContent.ts. Import the source module when touching this file.
import type {
  FloDownContent,
  Inline,
  ParagraphNode,
  SymrefNode,
} from "@/types/floDown.types";

type MarkReferenceLatexItem = {
  pageNumber: number;
  symbolName: string;
  verbalization: string | null;
};

type MarkReferenceLatexIdentity = {
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

type FloDownBlock = {
  addElement: (node: wasm_bindgen.FloDownBlock) => void;
  getStex(): string;
  clear?: () => void;
};

type FloDownLib = {
  FloDown: {
    fromUri: (uri: string) => FloDownBlock;
  };
};

function getDisplaySymbol(symbolName: string): string {
  try {
    const parsed = parseUri(symbolName);
    return parsed.symbol || symbolName;
  } catch {
    return symbolName;
  }
}

function rewriteContent(
  content: FloDownContent[],
  identity: MarkReferenceLatexIdentity,
): FloDownContent[] {
  // Remaining issue: own URI rewrite; does not use mountStatementOnFloDown / addSymbolDeclaration.
  return content.map((item) => {
    if (typeof item === "string") return item;
    if (item.type !== "symref") return item;

    const symref = item as SymrefNode;
    if (isHttp(symref.uri)) return symref;

    return {
      ...symref,
      uri: symbolUriFromGlox({
        futureRepo: identity.futureRepo,
        filePath: identity.filePath,
        fileName: identity.fileName,
        symbolName: symref.uri,
      }),
    };
  });
}

function getReferenceLabel(reference: MarkReferenceLatexItem): string {
  return (
    (reference.verbalization || getDisplaySymbol(reference.symbolName)).trim() ||
    getDisplaySymbol(reference.symbolName)
  );
}

function buildPageParagraph(
  pageNumber: number,
  references: MarkReferenceLatexItem[],
): ParagraphNode {
  const content: Inline[] = [
    `Page ${pageNumber} of this file contains the following references: `,
  ];

  references.forEach((reference, index) => {
    if (index > 0) {
      content.push(", ");
    }

    content.push({
      type: "symref",
      uri: reference.symbolName,
      content: [getReferenceLabel(reference)],
    });
  });

  return {
    type: "paragraph",
    content,
  };
}

export function getMarkReferenceLatexDownloadName(filename: string): string {
  const baseName = filename.replace(/\.[^.]+$/, "");
  return `${baseName}_index.en.tex`;
}

export async function buildMarkReferenceLatex(
  identity: MarkReferenceLatexIdentity,
  references: MarkReferenceLatexItem[],
): Promise<string> {
  if (typeof window === "undefined") return "";

  const floDown = (await initFloDown()) as FloDownLib;

  const fdVisible = createFloDownDocumentFromGlox(
    floDown.FloDown as Parameters<typeof createFloDownDocumentFromGlox>[0],
    {
      futureRepo: identity.futureRepo,
      filePath: identity.filePath,
      fileName: identity.fileName,
      language: identity.language,
    },
  );

  try {
    const referencesByPage = new Map<number, MarkReferenceLatexItem[]>();

    for (const reference of references) {
      const current = referencesByPage.get(reference.pageNumber) ?? [];
      current.push(reference);
      referencesByPage.set(reference.pageNumber, current);
    }

    const sortedPages = Array.from(referencesByPage.keys()).sort((a, b) => a - b);

    for (const pageNumber of sortedPages) {
      const paragraph = buildPageParagraph(
        pageNumber,
        referencesByPage.get(pageNumber) ?? [],
      );
      fdVisible.addElement({
        ...paragraph,
        content: rewriteContent(paragraph.content, identity) as Inline[],
      });
    }

    return fdVisible.getStex().trimEnd();
  } finally {
    try {
      fdVisible.clear?.();
    } catch {}
  }
}
