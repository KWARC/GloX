import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

/**
 * Extracts all symbol names from LaTeX macros in the given text
 */
function extractSymbols(latex: string): {
  defined: Set<string>;
  referenced: Set<string>;
} {
  const defined = new Set<string>();
  const referenced = new Set<string>();

  // Match \definiendum{symbol} or \definiendum[alias]{symbol}
  const definiendumRegex = /\\definiendum(?:\[[^\]]*\])?\{([^}]+)\}/g;
  let match;
  while ((match = definiendumRegex.exec(latex)) !== null) {
    defined.add(match[1].trim());
  }

  // Match \definame{symbol} or \definame[alias]{symbol}
  const definameRegex = /\\definame(?:\[[^\]]*\])?\{([^}]+)\}/g;
  while ((match = definameRegex.exec(latex)) !== null) {
    defined.add(match[1].trim());
  }

  // Match \sn{symbol}, \sr{symbol}, \sns{symbol}
  // ✅ extract ONLY the symbol name (before '?')
  const refRegex = /\\s(?:n|r|ns)\{([^}?]+)\?/g;
  while ((match = refRegex.exec(latex)) !== null) {
    referenced.add(match[1].trim());
  }

  return { defined, referenced };
}

/**
 * Server function to generate complete LaTeX with dependency resolution
 */
export const generateLatexWithDependencies = createServerFn<
  any,
  "POST",
  { documentId: string },
  Promise<string>
>({ method: "POST" }).handler(async (ctx) => {
  const { documentId } = ctx.data ?? {};

  if (!documentId) {
    throw new Error("documentId is required");
  }

  // 1. Fetch all extracted text for this document
  const extracts = await prisma.extractedText.findMany({
    where: { documentId },
    select: { statement: true },
    orderBy: { createdAt: "asc" },
  });

  // 2. Scan all statements to find defined and referenced symbols
  const allDefined = new Set<string>();
  const allReferenced = new Set<string>();

  for (const extract of extracts) {
    const { defined, referenced } = extractSymbols(extract.statement);
    defined.forEach((sym) => allDefined.add(sym));
    referenced.forEach((sym) => allReferenced.add(sym));
  }

  // 3. Query database for symbol metadata
  const allSymbols = new Set([...allDefined, ...allReferenced]);

  const definienda = await prisma.definiendum.findMany({
    where: {
      symbolName: { in: Array.from(allSymbols) },
    },
  });

  const definitions = await prisma.definition.findMany({
    where: {
      name: { in: Array.from(allReferenced) },
    },
  });

  // 4. Build \symdecl* declarations
  const symdecls: string[] = [];
  const declaredSymbols = new Set<string>();

  for (const def of definienda) {
    // Only emit if symbol is actually defined in content AND symbolDeclared is true
    if (
      allDefined.has(def.symbolName) &&
      def.symbolDeclared &&
      !declaredSymbols.has(def.symbolName)
    ) {
      symdecls.push(`\\symdecl*{${def.symbolName}}`);
      declaredSymbols.add(def.symbolName);
    }
  }

  // 5. Build module imports
  const imports: string[] = [];
  const importedModules = new Set<string>();

  for (const definition of definitions) {
    const moduleKey = `${definition.archive}/${definition.filePath}/${definition.fileName}`;

    if (importedModules.has(moduleKey)) {
      continue; // Skip duplicates
    }

    let importStmt: string;
    if (definition.archive === "mod") {
      // \importmodule{mod?fileName}
      importStmt = `\\importmodule{${definition.archive}?${definition.fileName}}`;
    } else {
      // \usemodule[archive/filePath]{mod?fileName}
      importStmt = `\\usemodule[${definition.archive}/${definition.filePath}]{mod?${definition.fileName}}`;
    }

    imports.push(importStmt);
    importedModules.add(moduleKey);
  }

  // 6. Generate final LaTeX
  const title = "";
  const moduleName = "";
  const statements = extracts.map((e) => e.statement);

  return `\\documentclass{stex}
\\libinput{preamble}
\\begin{document}
\\begin{smodule}[title={${title}}]{${moduleName}}
${imports.join("\n")}

${symdecls.join("\n")}

${statements.join("\n\n")}

\\end{smodule}
\\end{document}`;
});
