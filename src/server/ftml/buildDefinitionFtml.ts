import prisma from "@/lib/prisma";

/* ================== LOAD ================== */

export async function loadDefinitionForFtml(definitionId: string) {
  return prisma.definition.findUnique({
    where: { id: definitionId },
    include: {
      definiendum: true,
      symbolicRefs: {
        include: { symbolicReference: true },
      },
    },
  });
}

type LoadedDefinition = Awaited<ReturnType<typeof loadDefinitionForFtml>>;
type NonNullDefinition = NonNullable<LoadedDefinition>;

/* ================== REGEX ================== */

const MACRO_REGEX =
  /\\definiendum\{([^}]+)\}\{([^}]+)\}|\\definame\{([^}]+)\}|\\sn\{([^?}]+)\?([^}]+)\}|\\sr\{([^?}]+)\?([^}]+)\}\{([^}]+)\}/g;

/* ================== HELPERS ================== */

function stripSDefinitionEnvironment(input: string): string {
  return input
    .replace(/\\begin\{sdefinition\}/g, "")
    .replace(/\\end\{sdefinition\}/g, "")
    .trim();
}

function extractDefinitionalMacros(statement: string) {
  const clean = stripSDefinitionEnvironment(statement);
  return {
    usesDefinition: /\\definiendum\{/.test(clean) || /\\definame\{/.test(clean),
  };
}

/* ================== MAIN ================== */

export function buildDefinitionFtml(def: NonNullDefinition) {
  const { usesDefinition } = extractDefinitionalMacros(def.statement);

  if (usesDefinition && !def.definiendum) {
    throw new Error(
      "Definition uses \\definiendum or \\definame but no definiendum exists in DB",
    );
  }

  const symbolMap = new Map(
    def.symbolicRefs.map((r) => [
      r.symbolicReference.name,
      r.symbolicReference.conceptUri,
    ]),
  );

  let definiendumUri: string | undefined;
  const localSymbols: { name: string }[] = [];
  let requiresModule = false;

  if (usesDefinition && def.definiendum) {
    if (usesDefinition && def.definiendum) {
      // definitional symbols are ALWAYS local
      definiendumUri = `LOCAL:${def.definiendum.symbolName}`;
      localSymbols.push({ name: def.definiendum.symbolName });
      requiresModule = true;
    } else {
      // ✅ PLACEHOLDER ONLY
      definiendumUri = `LOCAL:${def.definiendum.symbolName}`;
      localSymbols.push({ name: def.definiendum.symbolName });
      requiresModule = true;
    }
  }

  const clean = stripSDefinitionEnvironment(def.statement);
  const matches = clean.matchAll(MACRO_REGEX);

  const paragraphContent: any[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const index = match.index!;
    if (index > lastIndex) {
      paragraphContent.push(clean.slice(lastIndex, index));
    }

    if (match[1] && match[2] && usesDefinition) {
      paragraphContent.push({
        type: "definiendum",
        uri: definiendumUri,
        content: [match[2]],
      });
    } else if (match[3] && usesDefinition) {
      paragraphContent.push({
        type: "definiens",
        uri: definiendumUri,
        content: [match[3]],
      });
    } else if (match[4] && match[5]) {
      const uri = symbolMap.get(match[4]);
      paragraphContent.push(
        uri ? { type: "symref", uri, content: [match[5]] } : match[5],
      );
    } else if (match[6] && match[7]) {
      const uri = symbolMap.get(match[6]);
      paragraphContent.push(
        uri ? { type: "symref", uri, content: [match[7]] } : match[7],
      );
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < clean.length) {
    paragraphContent.push(clean.slice(lastIndex));
  }

  return {
    ftml: usesDefinition
      ? {
          type: "definition",
          for_symbols: definiendumUri ? [definiendumUri] : [],
          content: [{ type: "paragraph", content: paragraphContent }],
        }
      : {
          type: "paragraph",
          content: paragraphContent,
        },
    localSymbols,
    requiresModule,
  };
}
