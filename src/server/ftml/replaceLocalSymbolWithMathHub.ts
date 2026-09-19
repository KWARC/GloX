import {
  declaredUrisFromJson,
  parseDeclaredSymbolsInfo,
  removeDeclarationByUri,
} from "@/server/declaredSymbolsInfo";
import {
  astReferencesUri,
  retargetUriInAst,
} from "@/server/ftml/retargetUriInAst";
import type { FloDownStatement } from "@/types/floDown.types";

/** MathHub-duplicate write input (S-SYM-03). No FloDown ID list. */
export type DefiningBlockAction = "keep" | "delete";

export type ReplaceLocalSymbolWithMathHubInput = {
  localSymbolUri: string;
  mathHubUri: string;
  definingBlockAction: DefiningBlockAction;
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

export function findDeclaringBlockIdForLocalUri(
  snapshot: RetargetSnapshot,
  localSymbolUri: string,
): string | null {
  const target = localSymbolUri.trim();
  for (const row of snapshot.floDown) {
    if (declaredUrisFromJson(row.declaredSymbolsInfo).includes(target)) {
      return row.id;
    }
  }
  return null;
}

export function declaringBlockHasOtherLocalDeclarations(
  declaredSymbolsInfo: unknown,
  localSymbolUri: string,
): boolean {
  const target = localSymbolUri.trim();
  return declaredUrisFromJson(declaredSymbolsInfo).some((uri) => uri !== target);
}

export function canDeleteDeclaringBlockForMathHubDuplicate(
  declaredSymbolsInfo: unknown,
  localSymbolUri: string,
): boolean {
  const target = localSymbolUri.trim();
  const uris = declaredUrisFromJson(declaredSymbolsInfo);
  if (!uris.includes(target)) return false;
  return !declaringBlockHasOtherLocalDeclarations(
    declaredSymbolsInfo,
    localSymbolUri,
  );
}

/** FloDown block ids to remove after retarget (delete defining block only). */
export function resolveDefiningBlockDeleteIds(
  snapshot: RetargetSnapshot,
  localSymbolUri: string,
  definingBlockAction: DefiningBlockAction,
): string[] {
  if (definingBlockAction === "keep") return [];

  const declaringId = findDeclaringBlockIdForLocalUri(snapshot, localSymbolUri);
  if (!declaringId) {
    throw new Error("No declaring block found for this symbol");
  }

  const row = snapshot.floDown.find((entry) => entry.id === declaringId);
  if (!row) {
    throw new Error("No declaring block found for this symbol");
  }

  if (
    declaringBlockHasOtherLocalDeclarations(
      row.declaredSymbolsInfo,
      localSymbolUri,
    )
  ) {
    throw new Error(
      "Cannot delete this block while it declares other local symbols",
    );
  }

  return [declaringId];
}

export function parseReplaceLocalSymbolWithMathHubInput(
  data: Record<string, unknown>,
): ReplaceLocalSymbolWithMathHubInput {
  const localSymbolUri =
    typeof data.localSymbolUri === "string" ? data.localSymbolUri.trim() : "";
  const mathHubUri =
    typeof data.mathHubUri === "string" ? data.mathHubUri.trim() : "";
  const action = data.definingBlockAction;
  if (action !== "keep" && action !== "delete") {
    throw new Error("definingBlockAction must be keep or delete");
  }
  return {
    localSymbolUri,
    mathHubUri,
    definingBlockAction: action,
  };
}

export function roleMayReplaceLocalSymbolWithMathHub(
  role: string | null | undefined,
): boolean {
  return role === "CURATOR" || role === "ADMIN";
}
