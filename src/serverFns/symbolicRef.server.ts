import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  findUniqueTextLocation,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import { ParsedMathHubUri, parseUri } from "@/server/parseUri";
import {
  RootNode,
  SymrefNode,
  assertFtmlStatement,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/ftml.types";
import { createServerFn } from "@tanstack/react-start";

type SymbolicRefInput = {
  definitionId: string;
  selection: {
    text: string;
  };
  symRef: UnifiedSymbolicReference;
};

export const symbolicRef = createServerFn({ method: "POST" })
  .inputValidator((data: SymbolicRefInput) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const userId = userRes.user.id;

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

    const currentAst: RootNode = normalizeToRoot(
      assertFtmlStatement(definition.statement),
    );

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

    if (symRef.source === "DB") {
      const defNode = updatedAst.content[0];

      if (defNode && defNode.type === "definition") {
        const existing = defNode.for_symbols ?? [];

        if (!existing.includes(parsed.conceptUri)) {
          defNode.for_symbols = [...existing, parsed.conceptUri];
        }
      }
    }

    const statementToStore = unwrapRoot(updatedAst);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.definition.findUniqueOrThrow({
        where: { id: definitionId },
      });

      const nextVersion = existing.currentVersion + 1;

      await tx.definitionVersion.create({
        data: {
          definitionId,
          versionNumber: nextVersion,
          originalText: existing.originalText,
          statement: JSON.parse(JSON.stringify(statementToStore)),
          editedById: userId,
        },
      });

      await tx.definition.update({
        where: { id: definitionId },
        data: {
          statement: JSON.parse(JSON.stringify(statementToStore)),
          updatedById: userId,
          currentVersion: nextVersion,
        },
      });
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
