export function generateLatex({
  title = "",
  moduleName = "",
  imports = [],
  definition = "",
}: {
  title?: string;
  moduleName?: string;
  imports?: string[];
  definition?: string;
}) {
  return `\\documentclass{stex}
\\libinput{preamble}
\\begin{document}
\\begin{smodule}[title={${title}}]{${moduleName}}
${imports.map((i) => `\\importmodule${i}`).join("\n")}
\\begin{sdefinition}
${definition}
\\end{sdefinition}
\\end{smodule}
\\end{document}`;
}
