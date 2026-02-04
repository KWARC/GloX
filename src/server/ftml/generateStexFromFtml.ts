import { initFloDown } from "@/lib/flodownClient";
import {
  collectLocalSymbols,
  replaceLocalUris,
} from "@/server/ftml/normalizeFtml";
import { normalizeToRoot } from "@/types/ftml.types";

export async function generateStexFromFtml(ftmlAst: any): Promise<string> {
  const floDown = await initFloDown();
  floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

  const fd = floDown.FloDown.fromUri("http://temp?a=temp&d=temp&l=en");

  const normalized = normalizeToRoot(ftmlAst);
  const symbols = collectLocalSymbols(normalized);

  const uriMap = new Map<string, string>();
  for (const name of symbols) {
    uriMap.set(name, fd.addSymbolDeclaration(name));
  }

  const resolved = replaceLocalUris(structuredClone(normalized), uriMap);

  for (const element of resolved.content) {
    fd.addElement(element);
  }

  (window as any).__FLODOWNS ??= [];
  (window as any).__FLODOWNS.push(fd);

  return fd.getStex();
}
