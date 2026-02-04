import prisma from "@/lib/prisma";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  findUniqueTextLocation,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import { ParsedMathHubUri, parseUri } from "@/server/parseUri";
import { normalizeToRoot, SymrefNode, unwrapRoot } from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

type ResolveSymbolicRefInput = {
  definitionId: string;
  selection: {
    text: string;
  };
  symRef: UnifiedSymbolicReference;
};

export const resolveSymbolicRef = createServerFn({ method: "POST" })
  .inputValidator((data: ResolveSymbolicRefInput) => data)
  .handler(async ({ data }) => {
    const { definitionId, selection, symRef } = data;

    let parsed: ParsedMathHubUri;
    if (symRef.source === "MATHHUB") {
      parsed = parseUri(symRef.uri);
    } else {
      parsed = {
        archive: symRef.futureRepo,
        filePath: symRef.filePath,
        fileName: symRef.fileName,
        language: symRef.language,
        symbol: symRef.symbolName,
        conceptUri: symRef.symbolName,
      };
    }

    const definition = await prisma.definition.findUnique({
      where: { id: definitionId },
    });

    if (!definition) {
      throw new Error("Definition not found");
    }

    const currentAst = normalizeToRoot(definition.statement as any);

    let location;
    try {
      location = findUniqueTextLocation(currentAst, selection.text);
    } catch (error) {
      throw new Error(
        `Cannot add symbolic reference: ${(error as Error).message}`,
      );
    }

    const targetPath = [location.paragraphIndex, location.contentIndex];
    if (pathTraversesSemanticNode(currentAst, targetPath)) {
      throw new Error(
        "Cannot add symbolic reference inside existing definiendum or symref",
      );
    }

    const symrefNode: SymrefNode = {
      type: "symref",
      uri: parsed.conceptUri,
      content: [selection.text],
    };

    const updatedAst = replaceTextWithNode(
      currentAst,
      location,
      location.offset + selection.text.length,
      symrefNode,
    );

    const statementToStore = unwrapRoot(updatedAst);

    await prisma.definition.update({
      where: { id: definitionId },
      data: { statement: statementToStore },
    });

    const symbolicRef = await prisma.symbolicReference.create({
      data: {
        name: parsed.symbol,
        conceptUri: parsed.conceptUri,
        archive: parsed.archive,
        filePath: parsed.filePath,
        fileName: parsed.fileName,
        language: parsed.language,
      },
    });

    await prisma.definitionSymbolicRef.create({
      data: {
        definitionId,
        symbolicReferenceId: symbolicRef.id,
        source: symRef.source === "DB" ? "DEFINIENDUM" : "MATHHUB",
      },
    });

    return { ok: true };
  });
