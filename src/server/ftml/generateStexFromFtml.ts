import { initFloDown } from "@/lib/flodownClient";
import {
  addSymbols,
  replaceUris,
  removeSymdeclForFloDown,
} from "@/server/ftml/normalizeFtml";
import { normalizeToRoot } from "@/types/ftml.types";

export async function generateStexFromFtml(ftmlAst: any): Promise<string> {
  const floDown = await initFloDown();
  floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

  const fd = floDown.FloDown.fromUri("http://temp?a=temp&d=temp&l=en");

  const normalized = normalizeToRoot(ftmlAst);

  const symbols = addSymbols(normalized);
console.log({symbols})
  const uriMap = new Map<string, string>();
  for (const name of symbols) {
    uriMap.set(name, fd.addSymbolDeclaration(name));
  }


  const resolved = replaceUris(structuredClone(normalized), uriMap);

  const sanitized = removeSymdeclForFloDown(resolved);
console.log("URI Map:", uriMap);
  for (const element of sanitized.content) {
    console.log({element})
    fd.addElement(element);
  }

  (window as any).__FLODOWNS ??= [];
  (window as any).__FLODOWNS.push(fd);

  return fd.getStex();
}