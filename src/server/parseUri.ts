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
  const pParam = params.get("p") ?? "";

  const [archive, ...pathParts] = archiveParam.split("/");
  const filePath = pParam || pathParts.join("/");

  // ---------- CASE 1: definition-based ----------
  const d = params.get("d");
  const l = params.get("l");

  if (archive && d) {
    return {
      archive,
      filePath,
      fileName: d,
      language: l ?? "en",
      conceptUri: uri,
    };
  }

  // ---------- CASE 2: module + symbol ----------
  const m = params.get("m"); // module = file name
  const s = params.get("s"); // symbol / concept name

  if (archive && m && s) {
    return {
      archive,
      filePath,
      fileName: m,
      language: "en",
      conceptUri: s,
    };
  }

  // ---------- INVALID ----------
  throw new Error("Invalid MathHub URI");
}

