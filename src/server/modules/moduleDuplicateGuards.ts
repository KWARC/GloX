export const DUPLICATE_SEMANTICS_ERROR =
  "Cannot change semantics on a duplicate module description";

export const MARK_CANONICAL_MISSING_ERROR =
  "Canonical module description does not exist";

export const MARK_ALIAS_TARGET_ERROR =
  "Cannot mark a duplicate of a module that is already a duplicate";

export const MARK_SELF_ERROR = "A module cannot be marked as a duplicate of itself";

type AuthResult =
  | { loggedIn: false }
  | { loggedIn: true; user: { id: string; role: string } };

export function assertExtractorPlusAuth(userRes: AuthResult): {
  userId: string;
  role: string;
} {
  if (!userRes.loggedIn) throw new Error("Unauthorized");
  const { id: userId, role } = userRes.user;
  if (role !== "ADMIN" && role !== "CURATOR" && role !== "EXTRACTOR") {
    throw new Error("Forbidden");
  }
  return { userId, role };
}

export function assertNotDuplicateDescription(row: {
  duplicateOfModuleId: string | null;
}): void {
  if (row.duplicateOfModuleId) {
    throw new Error(DUPLICATE_SEMANTICS_ERROR);
  }
}

export function resolveMarkDuplicateTarget(input: {
  sourceModuleId: string;
  target: { moduleId: string; duplicateOfModuleId: string | null } | null;
}): { canonicalModuleId: string } {
  if (!input.target) {
    throw new Error(MARK_CANONICAL_MISSING_ERROR);
  }
  if (input.target.moduleId === input.sourceModuleId) {
    throw new Error(MARK_SELF_ERROR);
  }
  if (input.target.duplicateOfModuleId) {
    throw new Error(MARK_ALIAS_TARGET_ERROR);
  }
  return { canonicalModuleId: input.target.moduleId };
}

export type MarkDuplicatePlan = {
  duplicateOfModuleId: string;
  deleteDefinitionBlocks: true;
  keepTitleStatement: true;
  clearInhaltAndLernziele: true;
};

export function planMarkDuplicate(input: {
  sourceModuleId: string;
  target: { moduleId: string; duplicateOfModuleId: string | null } | null;
}): MarkDuplicatePlan {
  const { canonicalModuleId } = resolveMarkDuplicateTarget(input);
  return {
    duplicateOfModuleId: canonicalModuleId,
    deleteDefinitionBlocks: true,
    keepTitleStatement: true,
    clearInhaltAndLernziele: true,
  };
}

export type UnmarkDuplicatePlan = {
  duplicateOfModuleId: null;
  reseedTitleInhaltLernziele: true;
};

export function planUnmarkDuplicate(): UnmarkDuplicatePlan {
  return {
    duplicateOfModuleId: null,
    reseedTitleInhaltLernziele: true,
  };
}

export async function assertFloDownBlockAllowsSemanticMutation(
  lookup: {
    moduleDescription: {
      findUnique: (args: {
        where: { id: string };
        select: { duplicateOfModuleId: true };
      }) => Promise<{ duplicateOfModuleId: string | null } | null>;
    };
  },
  moduleDescriptionId: string | null | undefined,
): Promise<void> {
  if (!moduleDescriptionId) return;
  const row = await lookup.moduleDescription.findUnique({
    where: { id: moduleDescriptionId },
    select: { duplicateOfModuleId: true },
  });
  if (row) assertNotDuplicateDescription(row);
}
