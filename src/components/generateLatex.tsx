export function generateLatex({
  title = "",
  moduleName = "",
  imports = [],
  definitions = [],
  extracts = [],
}: {
  title?: string;
  moduleName?: string;
  imports?: string[];
  definitions?: string[];
  extracts?: string[];
}) {
  return `\\documentclass{stex}
\\libinput{preamble}
\\begin{document}
\\begin{smodule}[title={${title}}]{${moduleName}}
${imports.map((i) => `\\importmodule${i}`).join("\n")}

${definitions.join("\n\n")}

${extracts.join("\n\n")}

\\end{smodule}
\\end{document}`;
}
