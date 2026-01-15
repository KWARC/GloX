import prisma from "@/lib/prisma";
import { createServerFn } from "@tanstack/react-start";

function extractSymbols(latex: string): {
  defined: Set<string>;
  referenced: Set<string>;
} {
  const defined = new Set<string>();
  const referenced = new Set<string>();

  const definiendumRegex = /\\definiendum(?:\[[^\]]*\])?\{([^}]+)\}/g;
  let match;
  while ((match = definiendumRegex.exec(latex)) !== null) {
    defined.add(match[1].trim());
  }

  const definameRegex = /\\definame(?:\[[^\]]*\])?\{([^}]+)\}/g;
  while ((match = definameRegex.exec(latex)) !== null) {
    defined.add(match[1].trim());
  }

  const refRegex = /\\s(?:n|r|ns)\{([^}?]+)\?/g;
  while ((match = refRegex.exec(latex)) !== null) {
    referenced.add(match[1].trim());
  }

  return { defined, referenced };
}

export type GenerateLatexInput = {
  documentId: string;
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
};

export const generateLatexWithDependencies = createServerFn({
  method: "POST",
})
  .inputValidator((data: GenerateLatexInput) => data)
  .handler(async ({ data }) => {
    const { documentId, futureRepo, filePath, fileName, language } = data;

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

    const allDefined = new Set<string>();
    const allReferenced = new Set<string>();

    for (const definition of definitions) {
      const { defined, referenced } = extractSymbols(definition.statement);
      defined.forEach((sym) => allDefined.add(sym));
      referenced.forEach((sym) => allReferenced.add(sym));
    }

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

    const symdecls: string[] = [];
    const declaredSymbols = new Set<string>();

    for (const def of definienda) {
      if (
        allDefined.has(def.symbolName) &&
        def.symbolDeclared &&
        !declaredSymbols.has(def.symbolName)
      ) {
        symdecls.push(`\\symdecl*{${def.symbolName}}`);
        declaredSymbols.add(def.symbolName);
      }
    }

    const imports: string[] = [];
    const importedModules = new Set<string>();

    for (const ref of symbolicReferences) {
      const moduleKey = `${ref.archive}/${ref.filePath}/${ref.fileName}`;
      if (importedModules.has(moduleKey)) continue;

      const importStmt =
        ref.archive === "mod"
          ? `\\importmodule{${ref.archive}?${ref.fileName}}`
          : `\\usemodule[${ref.archive}/${ref.filePath}]{mod?${ref.fileName}}`;

      imports.push(importStmt);
      importedModules.add(moduleKey);
    }

    const statements = definitions.map((e) => e.statement);

    return `\\documentclass{stex}
\\libinput{preamble}
\\begin{document}
\\begin{smodule}[title={${fileName}}]{${fileName}}
${imports.join("\n")}

${symdecls.join("\n")}

${statements.join("\n\n")}

\\end{smodule}
\\end{document}`;
  });
