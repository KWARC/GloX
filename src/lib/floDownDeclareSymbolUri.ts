import { initFloDown } from "@/lib/flodownClient";
import { createFloDownDocumentFromGlox } from "@/lib/flodownUris";

/** Ask FloDown for a symbol URI. GloX does not mint URIs. */
export async function floDownDeclareSymbolUri(params: {
  futureRepo: string;
  filePath: string;
  fileName: string;
  language: string;
  symbolName: string;
}): Promise<string> {
  const { FloDown } = await initFloDown();
  const fd = createFloDownDocumentFromGlox(FloDown, {
    futureRepo: params.futureRepo,
    filePath: params.filePath,
    fileName: params.fileName,
    language: params.language,
  });
  const uri = fd.addSymbolDeclaration?.(params.symbolName.trim());
  if (!uri) {
    throw new Error("FloDown rejected symbol declaration");
  }
  return uri;
}
