import prisma from "@/lib/prisma";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import { ParsedMathHubUri, parseUri } from "@/server/parseUri";
import { createServerFn } from "@tanstack/react-start";

type ResolveSymbolicRefInput = {
  definitionId: string;
  selection: {
    text: string;
    startOffset: number;
    endOffset: number;
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

    const macro = `\\symref{${parsed.symbol}}`;

    const updatedStatement =
      definition.statement.slice(0, selection.startOffset) +
      macro +
      definition.statement.slice(selection.endOffset);

    await prisma.definition.update({
      where: { id: definitionId },
      data: { statement: updatedStatement },
    });

    const symbolicRef = await prisma.symbolicReference.create({
      data: {
        name: parsed.symbol,
        conceptUri: parsed.conceptUri,
        archive: parsed.archive,
        filePath: parsed.filePath,
        fileName: parsed.fileName,
        language: parsed.language,
        definiendumId: null,
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
