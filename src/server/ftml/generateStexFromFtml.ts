import { initFloDown } from "@/lib/flodownClient";
import { FtmlStatement, normalizeToRoot } from "@/types/ftml.types";
import { finalFloDown } from "../parseUri";

export async function generateStexFromFtml(
  ftmlAst: FtmlStatement,
): Promise<string> {
  const floDown = await initFloDown();
  floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

  const fd = floDown.FloDown.fromUri("http://temp?a=temp&d=temp&l=en");

  const root = normalizeToRoot(ftmlAst);
  for (const block of root.content) {
    if (block.type === "paragraph") {
      fd.addElement(block);
      continue;
    }

    if (block.type !== "definition") continue;

    const symbolName = block.for_symbols?.[0];
    if (!symbolName) continue;

    const symbol = fd.addSymbolDeclaration(symbolName);
    const finalizedFTML = finalFloDown(block, symbol);
    fd.addElement(finalizedFTML);
  }

  return fd.getStex();
}
