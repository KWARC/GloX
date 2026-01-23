import prisma from "@/lib/prisma";

export async function loadDefinitionForFtml(definitionId: string) {
  return prisma.definition.findUnique({
    where: { id: definitionId },
    include: {
      definiendum: true,
      symbolicRefs: {
        include: {
          symbolicReference: true,
        },
      },
    },
  });
}

type LoadedDefinition = Awaited<ReturnType<typeof loadDefinitionForFtml>>;
type NonNullDefinition = NonNullable<LoadedDefinition>;

type Token =
  | { type: "text"; value: string }
  | { type: "definame"; label: string }
  | { type: "definiendum"; key: string; label: string }
  | { type: "sn"; key: string; label: string }
  | { type: "sr"; key: string; label: string };

const MACRO_REGEX =
  /\\definiendum\{([^}]+)\}\{([^}]+)\}|\\definame\{([^}]+)\}|\\sn\{([^?}]+)\?([^}]+)\}|\\sr\{([^?}]+)\?([^}]+)\}\{([^}]+)\}/g;

function stripSDefinitionEnvironment(input: string): string {
  return input
    .replace(/\\begin\{sdefinition\}/g, "")
    .replace(/\\end\{sdefinition\}/g, "")
    .trim();
}

function buildLocalSymbolUri(
  def: NonNullable<NonNullDefinition["definiendum"]>,
) {
  const params = new URLSearchParams({
    a: def.futureRepo,
    p: def.filePath,
    m: def.fileName,
    l: def.language,
    s: def.symbolName,
  });

  return `http://test?${params.toString()}`;
}

function normalizeUri(uri?: string) {
  if (!uri) return undefined;

  // Only fix s=, do NOT touch a/p/m
  return uri.replace(/([?&]s=)([^&]+)/, (_, prefix, value) => {
    try {
      // decode first to avoid double encoding
      const decoded = decodeURIComponent(value);
      console.log({decoded})
      return `${prefix}${decoded}`;
    } catch {
      return `${prefix}${value}`;
    }
  });
}

export function tokenizeStatement(input: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(MACRO_REGEX)) {
    const index = match.index!;
    if (index > lastIndex) {
      tokens.push({ type: "text", value: input.slice(lastIndex, index) });
    }

    if (match[1] && match[2]) {
      tokens.push({
        type: "definiendum",
        key: match[1],
        label: match[2],
      });
    } else if (match[3]) {
      tokens.push({ type: "definame", label: match[3] });
    } else if (match[4] && match[5]) {
      tokens.push({ type: "sn", key: match[4], label: match[5] });
    } else if (match[6] && match[8]) {
      tokens.push({ type: "sr", key: match[6], label: match[8] });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: "text", value: input.slice(lastIndex) });
  }

  return tokens;
}

export function buildDefinitionFtml(def: NonNullDefinition) {
  const symbolMap = new Map(
    def.symbolicRefs.map((r) => [
      r.symbolicReference.name,
      r.symbolicReference.conceptUri,
    ]),
  );

  const definiendumUri = def.definiendum
    ? normalizeUri(buildLocalSymbolUri(def.definiendum))
    : undefined;

  const cleanStatement = stripSDefinitionEnvironment(def.statement);
  const tokens = tokenizeStatement(cleanStatement);

  // Build inline content for the paragraph inside the definition
  const content = tokens.map((t) => {
    if (t.type === "text") return t.value;

    if (t.type === "definiendum") {
      // Render as definiendum inline element
      if (!definiendumUri) return t.label;
      return {
        type: "definiendum",
        uri: definiendumUri,
        content: [t.label],
      };
    }

    if (t.type === "definame") {
      // Render as definiens inline element (definame = the definition text)
      if (!definiendumUri) return t.label;
      return {
        type: "definiens",
        uri: definiendumUri,
        content: [t.label],
      };
    }

    // Handle sn and sr
    const uri = normalizeUri(symbolMap.get(t.key));
    if (!uri) return t.label;

    return {
      type: "symref",
      uri,
      content: [t.label],
    };
  });

  // Return a proper definition block (not just a paragraph!)
  return {
    type: "definition",
    for_symbols: definiendumUri ? [definiendumUri] : [],
    content: [
      {
        type: "paragraph",
        content,
      },
    ],
  };
}