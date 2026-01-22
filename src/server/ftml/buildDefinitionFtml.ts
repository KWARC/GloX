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

type Token =
  | { type: "text"; value: string }
  | { type: "definame"; label: string }
  | { type: "sn"; key: string; label: string }
  | { type: "sr"; key: string; label: string };

const MACRO_REGEX =
  /\\definiendum\{([^}]+)\}\{([^}]+)\}|\\definame\{([^}]+)\}|\\sn\{([^?}]+)\?([^}]+)\}|\\sr\{([^?}]+)\?([^}]+)\}\{([^}]+)\}/g;

function makeSymref(label: string, uri?: string) {
  if (!uri || !uri.includes("&s=")) {
    return { type: "text", text: label };
  }

  return {
    type: "symref",
    uri,
    content: [{ type: "text", text: label }],
  };
}

function normalizeUri(uri?: string) {
  if (!uri) return undefined;
  return uri.trim().replace(/^https:\/\//, "http://");
}

function stripSDefinitionEnvironment(input: string): string {
  return input
    .replace(/\\begin\{sdefinition\}/g, "")
    .replace(/\\end\{sdefinition\}/g, "")
    .trim();
}

export function tokenizeStatement(input: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(MACRO_REGEX)) {
    const index = match.index!;
    if (index > lastIndex) {
      tokens.push({
        type: "text",
        value: input.slice(lastIndex, index),
      });
    }

    if (match[1] && match[2]) {
      tokens.push({ type: "definame", label: match[2] });
    } else if (match[3]) {
      tokens.push({ type: "definame", label: match[3] });
    } else if (match[4] && match[5]) {
      tokens.push({
        type: "sn",
        key: match[4],
        label: match[5],
      });
    } else if (match[6] && match[7] && match[8]) {
      tokens.push({
        type: "sr",
        key: match[6],
        label: match[8],
      });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < input.length) {
    tokens.push({
      type: "text",
      value: input.slice(lastIndex),
    });
  }

  return tokens;
}

export function buildDefinitionFtml(
  def: Awaited<ReturnType<typeof loadDefinitionForFtml>>,
) {
  if (!def) throw new Error("Definition not found");

  const symbolMap = new Map(
    def.symbolicRefs.map((r) => [
      r.symbolicReference.name,
      r.symbolicReference.conceptUri,
    ]),
  );

  const cleanStatement = stripSDefinitionEnvironment(def.statement);
  const tokens = tokenizeStatement(cleanStatement);

  const content = tokens.map((t) => {
    if (t.type === "text") {
      return { type: "text", text: t.value };
    }

    if (t.type === "definame") {
      const uri = `http://mathhub.info?a=${def.futureRepo}&p=${def.filePath}&m=${def.fileName}&s=${encodeURIComponent(
        t.label,
      )}`;
      return makeSymref(t.label, normalizeUri(uri));
    }

    const uri = normalizeUri(symbolMap.get(t.key));
    return makeSymref(t.label, uri);
  });

  return {
    type: "paragraph",
    content,
  };
}
