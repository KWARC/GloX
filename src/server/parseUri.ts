export interface ParsedMathHubUri {
  archive: string;
  filePath: string;
  fileName: string;
  language: string;
  conceptUri: string;
  symbol: string;
}

export function parseUri(uri: string): ParsedMathHubUri {
  const url = new URL(uri);
  const params = url.searchParams;

  const archiveParam = params.get("a") ?? "";
  const pParam = params.get("p") ?? "";

  const [archive, ...pathParts] = archiveParam.split("/");
  const filePath = pParam || pathParts.join("/");

  const d = params.get("d");
  const l = params.get("l");
  const m = params.get("m");
  const s = params.get("s");

  // ---------- fileName-based ----------
  if (archive && d) {
    return {
      archive,
      filePath,
      fileName: d,
      language: l ?? "en",
      conceptUri: uri,
      symbol: d.replace(/-/g, " "),
    };
  }

  // ---------- conceptName ----------
  if (archive && m && s) {
    return {
      archive,
      filePath,
      fileName: m,
      language: "en",
      conceptUri: uri,
      symbol: s,
    };
  }

  throw new Error("Invalid MathHub URI");
}

export function formatSymbolicUriDisplay(uri: string): string {
  try {
    const url = new URL(uri);
    const params = url.searchParams;

    const archive = params.get("a");
    const symbol = params.get("s");
    const definiens = params.get("d");

    if (!archive) return uri;

    if (symbol) {
      return `${archive} ${symbol}`;
    }

    if (definiens) {
      return `${archive} ${definiens}`;
    }

    return archive;
  } catch {
    // Fallback for non-URL or malformed input
    return uri;
  }
}
