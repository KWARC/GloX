import prisma from "@/lib/prisma";
import { currentUser } from "@/server/auth/currentUser";
import { UnifiedSymbolicReference } from "@/server/document/SymbolicRef.types";
import {
  findAllTextOccurrences,
  pathTraversesSemanticNode,
  replaceTextWithNode,
} from "@/server/ftml/astOperations";
import { ParsedMathHubUri, parseUri } from "@/server/parseUri";
import {
  RootNode,
  SymrefNode,
  assertFloDownStatement,
  normalizeToRoot,
  unwrapRoot,
} from "@/types/floDown.types";
import { createServerFn } from "@tanstack/react-start";

type SymbolicRefInput = {
  floDownBlockId: string;
  selection: {
    text: string;
    startOffset: number;
    endOffset: number;
  };
  symRef: UnifiedSymbolicReference;
};

export const symbolicRef = createServerFn({ method: "POST" })
  .inputValidator((data: SymbolicRefInput) => data)
  .handler(async ({ data }) => {
    const userRes = await currentUser();
    if (!userRes.loggedIn) throw new Error("Unauthorized");

    const userId = userRes.user.id;

    const { floDownBlockId, selection, symRef } = data;

    let parsed: ParsedMathHubUri;

    if (symRef.source === "MATHHUB") {
      parsed = parseUri(symRef.uri);
    } else {
      const uri = (symRef.symbolUri ?? "").trim();
      if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
        throw new Error("Symbol URI required");
      }
      parsed = {
        archive: symRef.futureRepo,
        filePath: symRef.filePath,
        fileName: symRef.fileName,
        language: symRef.language,
        symbol: symRef.symbolName,
        conceptUri: uri,
      };
    }

    const floDownBlock = await prisma.floDownBlock.findUnique({
      where: { id: floDownBlockId },
    });

    if (!floDownBlock) {
      throw new Error("Content not found");
    }

    const currentAst: RootNode = normalizeToRoot(
      assertFloDownStatement(floDownBlock.statement),
    );

    let location;

    try {
      const occurrences = findAllTextOccurrences(currentAst, selection.text);

      location = occurrences.find(
        (loc) => loc.offset === selection.startOffset,
      );

      if (!location) {
        throw new Error("Exact selection match not found in AST");
      }
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
      selection.startOffset,
      selection.endOffset,
      symrefNode,
    );

    const statementToStore = unwrapRoot(updatedAst);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.floDownBlock.findUniqueOrThrow({
        where: { id: floDownBlockId },
      });

      const nextVersion = existing.currentVersion + 1;

      await tx.floDownBlockVersion.create({
        data: {
          floDownBlockId: floDownBlockId,
          versionNumber: nextVersion,
          originalText: existing.originalText,
          statement: JSON.parse(JSON.stringify(statementToStore)),
          editedById: userId,
        },
      });

      await tx.floDownBlock.update({
        where: { id: floDownBlockId },
        data: {
          statement: JSON.parse(JSON.stringify(statementToStore)),
          updatedById: userId,
          currentVersion: nextVersion,
        },
      });
    });

    return { ok: true };
  });
