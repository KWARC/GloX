export interface ParsedMathHubUri {
  archive: string;
  filePath: string;
  fileName: string;
  language: string;
  conceptUri: string;
}

export function parseUri(uri: string): ParsedMathHubUri {
  const url = new URL(uri);
  const params = url.searchParams;

  const archiveParam = params.get("a") ?? "";
  const fileName = params.get("d") ?? "";
  const language = params.get("l") ?? "";

 
  const [archive, ...pathParts] = archiveParam.split("/");
  const filePath = params.get("p") ?? pathParts.join("/");

  if (!archive || !fileName || !language) {
    throw new Error("Invalid MathHub URI");
  }

  return {
    archive,
    filePath,
    fileName,
    language,
    conceptUri: uri,
  };
}
