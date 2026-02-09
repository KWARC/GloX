import { initFloDown } from "@/lib/flodownClient";
import { FtmlStatement, normalizeToRoot } from "@/types/ftml.types";
import { rewriteForFloDown } from "../parseUri";

export async function generateStexFromFtml(
  ftmlAst: FtmlStatement,
): Promise<string> {
  const floDown = await initFloDown();
  floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

  const fd = floDown.FloDown.fromUri("http://temp?a=temp&d=temp&l=en");

  const root = normalizeToRoot(ftmlAst);
  const block = root.content[0];
  if (!block) return "";

  if (block.type === "paragraph") {
    fd.addElement(block);
    return fd.getStex();
  }

  if (block.type !== "definition") return "";

  const symbolName = block.for_symbols?.[0];
  if (!symbolName) return "";

  const symbol = fd.addSymbolDeclaration(symbolName);

  const finalizedFTML = rewriteForFloDown(block, symbol);

  fd.addElement(finalizedFTML);

  return fd.getStex();
}
