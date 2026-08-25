import { floDownDeclareSymbolUri } from "@/lib/floDownDeclareSymbolUri";

export type MoveDeclaration = {
  symbolName: string;
  symbolUri: string;
  fileName: string;
};

/** Ask FloDown for each new URI after an export-identity change. */
export async function floDownUriReplacementsForMove(
  declarations: readonly MoveDeclaration[],
  target: {
    futureRepo: string;
    filePath: string;
    language: string;
    fileName?: string;
  },
): Promise<Array<{ oldUri: string; newUri: string }>> {
  const uriReplacements: Array<{ oldUri: string; newUri: string }> = [];
  for (const declaration of declarations) {
    const newUri = await floDownDeclareSymbolUri({
      futureRepo: target.futureRepo,
      filePath: target.filePath,
      fileName: target.fileName ?? declaration.fileName,
      language: target.language,
      symbolName: declaration.symbolName,
    });
    if (newUri !== declaration.symbolUri) {
      uriReplacements.push({ oldUri: declaration.symbolUri, newUri });
    }
  }
  return uriReplacements;
}
