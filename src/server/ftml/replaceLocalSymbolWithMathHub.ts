import {
  parseDeclaredSymbolsInfo,
  removeDeclarationByUri,
} from "@/server/declaredSymbolsInfo";
import {
  astReferencesUri,
  retargetUriInAst,
} from "@/server/ftml/retargetUriInAst";
import type { FloDownStatement } from "@/types/floDown.types";

/** MathHub-duplicate write input (S-SYM-03). No FloDown ID list. */
export type ReplaceLocalSymbolWithMathHubInput = {
  localSymbolUri: string;
  mathHubUri: string;
};

export type FloDownUriHit = {
  kind: "floDown";
  id: string;
  status: string;
};

export type ModuleStatementUriHit = {
  kind: "moduleStatement";
  moduleId: string;
  field: "title" | "inhalt" | "lernziele";
};

export type LocalSymbolUriHit = FloDownUriHit | ModuleStatementUriHit;

export type FloDownRetargetRow = {
  id: string;
  status: string;
  statement: FloDownStatement;
  declaredSymbolsInfo: unknown;
  historicStatements: FloDownStatement[];
};

export type ModuleRetargetRow = {
  id: string;
  moduleId: string;
  titleStatement: FloDownStatement;
  inhaltStatement: FloDownStatement;
  lernzieleStatement: FloDownStatement;
};

export type RetargetSnapshot = {
  floDown: FloDownRetargetRow[];
  modules: ModuleRetargetRow[];
};

const MODULE_FIELDS = [
  "title",
  "inhalt",
  "lernziele",
] as const satisfies ReadonlyArray<ModuleStatementUriHit["field"]>;

export function collectLocalSymbolUriHits(
  snapshot: RetargetSnapshot,
  localSymbolUri: string,
): LocalSymbolUriHit[] {
  const hits: LocalSymbolUriHit[] = [];

  for (const row of snapshot.floDown) {
    if (astReferencesUri(row.statement, localSymbolUri)) {
      hits.push({ kind: "floDown", id: row.id, status: row.status });
    }
  }

  for (const mod of snapshot.modules) {
    const statements = {
      title: mod.titleStatement,
      inhalt: mod.inhaltStatement,
      lernziele: mod.lernzieleStatement,
    };
    for (const field of MODULE_FIELDS) {
      if (astReferencesUri(statements[field], localSymbolUri)) {
        hits.push({
          kind: "moduleStatement",
          moduleId: mod.moduleId,
          field,
        });
      }
    }
  }

  return hits;
}

export function retargetLocalSymbolSnapshot(
  snapshot: RetargetSnapshot,
  localSymbolUri: string,
  mathHubUri: string,
): RetargetSnapshot {
  return {
    floDown: snapshot.floDown.map((row) => ({
      ...row,
      statement: astReferencesUri(row.statement, localSymbolUri)
        ? retargetUriInAst(row.statement, localSymbolUri, mathHubUri)
        : row.statement,
      declaredSymbolsInfo: removeDeclarationByUri(
        parseDeclaredSymbolsInfo(row.declaredSymbolsInfo),
        localSymbolUri,
      ),
      historicStatements: row.historicStatements,
    })),
    modules: snapshot.modules.map((mod) => ({
      ...mod,
      titleStatement: retargetUriInAst(
        mod.titleStatement,
        localSymbolUri,
        mathHubUri,
      ),
      inhaltStatement: retargetUriInAst(
        mod.inhaltStatement,
        localSymbolUri,
        mathHubUri,
      ),
      lernzieleStatement: retargetUriInAst(
        mod.lernzieleStatement,
        localSymbolUri,
        mathHubUri,
      ),
    })),
  };
}

export function parseReplaceLocalSymbolWithMathHubInput(
  data: Record<string, unknown>,
): ReplaceLocalSymbolWithMathHubInput {
  return {
    localSymbolUri:
      typeof data.localSymbolUri === "string" ? data.localSymbolUri.trim() : "",
    mathHubUri: typeof data.mathHubUri === "string" ? data.mathHubUri.trim() : "",
  };
}

export function roleMayReplaceLocalSymbolWithMathHub(
  role: string | null | undefined,
): boolean {
  return role === "CURATOR" || role === "ADMIN";
}
