import { initFloDown } from "@/lib/flodownClient";
import { createFloDownDocumentFromGlox } from "@/lib/flodownUris";
import { mountStatementOnFloDown } from "@/lib/prepareFloDownStatement";
import { isHttp } from "@/server/ftml/statementContent";
import {
  FloDownStatement,
  normalizeToRoot,
} from "@/types/floDown.types";

export { isHttp };

export async function generateStexFromFloDown(
  statement: FloDownStatement,
  futureRepo: string,
  filePath: string,
  fileName: string,
  // Remaining issue: unused after boundary cleanup. Callers still pass per-block declaredSymbols.
  _declaredSymbolsPerBlock: readonly (readonly string[])[] = [],
  language = "en",
): Promise<string> {
  const floDown = await initFloDown();

  const fd = createFloDownDocumentFromGlox(floDown.FloDown, {
    futureRepo,
    filePath,
    fileName,
    language,
  });
  const mountFd = fd as Parameters<typeof mountStatementOnFloDown>[0];
  const root = normalizeToRoot(statement);

  for (const block of root.content) {
    mountStatementOnFloDown(mountFd, block);
  }

  return fd.getStex();
}
