import { initFloDown } from "@/lib/flodownClient";
import { createFloDownDocument, exportIdentityFromGlox } from "@/lib/flodownUris";
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
  _declaredSymbolsPerBlock: readonly (readonly string[])[] = [],
  language = "en",
): Promise<string> {
  const floDown = await initFloDown();

  const exportIdentity = exportIdentityFromGlox({
    futureRepo,
    filePath,
    fileName,
    language,
  });

  const fd = createFloDownDocument(floDown.FloDown, exportIdentity);
  const mountFd = fd as Parameters<typeof mountStatementOnFloDown>[0];
  const identity = { futureRepo, filePath, fileName };
  const root = normalizeToRoot(statement);

  for (const block of root.content) {
    mountStatementOnFloDown(mountFd, block, identity);
  }

  return fd.getStex();
}
