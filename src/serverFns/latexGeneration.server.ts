import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

/**
 * definitions all symbol names from LaTeX macros in the given text
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
  // ✅ symbolicReference ONLY the symbol name (before '?')
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
  {
    documentId: string;
    futureRepo: string;
    filePath: string;
    fileName: string;
    language: string;
  },
  Promise<string>
>({ method: "POST" }).handler(async (ctx) => {
  const { documentId, futureRepo, filePath, fileName, language } =
    ctx.data ?? ({} as any);

  if (!documentId || !futureRepo || !filePath || !fileName || !language) {
    throw new Error("documentId and path info are required");
  }

  // 1. Fetch all extracted text for this document
  const definitions = await prisma.definition.findMany({
    where: {
      documentId,
      futureRepo,
      filePath,
      fileName,
      language,
    },
    select: { statement: true },
    orderBy: { createdAt: "asc" },
  });

  // 2. Scan all statements to find defined and referenced symbols
  const allDefined = new Set<string>();
  const allReferenced = new Set<string>();

  for (const definition of definitions) {
    const { defined, referenced } = extractSymbols(definition.statement);
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

  const symbolicReferences = await prisma.symbolicReference.findMany({
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

  for (const symbolicReference of symbolicReferences) {
    const moduleKey = `${symbolicReference.archive}/${symbolicReference.filePath}/${symbolicReference.fileName}`;

    if (importedModules.has(moduleKey)) continue;

    let importStmt: string;
    if (symbolicReference.archive === "mod") {
      // \importmodule{mod?fileName}
      importStmt = `\\importmodule{${symbolicReference.archive}?${symbolicReference.fileName}}`;
    } else {
      // \usemodule[archive/filePath]{mod?fileName}
      importStmt = `\\usemodule[${symbolicReference.archive}/${symbolicReference.filePath}]{mod?${symbolicReference.fileName}}`;
    }

    imports.push(importStmt);
    importedModules.add(moduleKey);
  }

  // 6. Generate final LaTeX
  const title = "";
  const moduleName = "";
  const statements = definitions.map((e) => e.statement);

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
