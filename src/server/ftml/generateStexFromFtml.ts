import { initFloDown } from "@/lib/flodownClient";
import {
  addSymbols,
  replaceUris,
  removeSymdeclForFloDown,
} from "@/server/ftml/normalizeFtml";
import { FtmlStatement, RootNode, normalizeToRoot } from "@/types/ftml.types";

export async function generateStexFromFtml(
  ftmlAst: FtmlStatement,
): Promise<string> {
  const floDown = await initFloDown();
  floDown.setBackendUrl("https://mmt.beta.vollki.kwarc.info");

  const fd = floDown.FloDown.fromUri("http://temp?a=temp&d=temp&l=en");

  const normalized: RootNode = normalizeToRoot(ftmlAst);

  const symbols = addSymbols(normalized);
console.log({symbols})
  const uriMap = new Map<string, string>();
  for (const name of symbols) {
    const uri = fd.addSymbolDeclaration(name);
    if (uri) {
      uriMap.set(name, uri);
    }
  }


  const resolved = replaceUris(structuredClone(normalized), uriMap);

  const sanitized = removeSymdeclForFloDown(resolved) as RootNode;
console.log("URI Map:", uriMap);
  for (const element of sanitized.content) {
    console.log({ element });
    fd.addElement(element);
  }

  (window as any).__FLODOWNS ??= [];
  (window as any).__FLODOWNS.push(fd);

  return fd.getStex();
}