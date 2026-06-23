import PDFParser from "pdf2json";

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

type PdfRunTS = [number, number, number, number];

type PdfRun = {
  T?: string;
  TS?: PdfRunTS;
};

type PdfText = {
  x: number;
  y: number;
  R: PdfRun[];
};

type PdfPage = {
  Texts?: PdfText[];
};

type PdfData = {
  Pages?: PdfPage[];
};

type PdfParserError = Error | { parserError: Error };

const Y_TOLERANCE = 0.3;
const X_JOIN_THRESHOLD = 0.15;
const PAGE_BREAK_REGEX =
  /\r?\n----------------Page \((\d+)\) Break----------------\r?\n/g;

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function splitCamelCase(text: string): string {
  if (!/[a-z][A-Z]/.test(text)) return text;
  return text.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function isBold(ts?: PdfRunTS): boolean {
  return ts?.[2] === 1;
}

function isItalic(ts?: PdfRunTS): boolean {
  return ts?.[3] === 1;
}

function joinRuns(runs: PdfRun[]): string {
  let result = "";
  let prevTs: PdfRunTS | undefined;

  for (const run of runs) {
    if (!run.T) continue;

    const decoded = splitCamelCase(safeDecode(run.T));
    if (!decoded) continue;

    if (!result) {
      result = decoded;
      prevTs = run.TS;
      continue;
    }

    const prevEndsSpace = result.endsWith(" ");
    const currStartsSpace = decoded.startsWith(" ");

    const styleChanged =
      isBold(prevTs) !== isBold(run.TS) ||
      isItalic(prevTs) !== isItalic(run.TS);

    if (prevEndsSpace || currStartsSpace) {
      result += decoded;
    } else if (styleChanged) {
      result += " " + decoded;
    } else {
      result += decoded;
    }

    prevTs = run.TS;
  }

  return result;
}

type Token = {
  x: number;
  y: number;
  value: string;
};

function buildPageText(texts: PdfText[]): string {
  if (!texts.length) return "";

  const tokens: Token[] = texts
    .map((t) => {
      const value = joinRuns(t.R).trim();
      if (!value) return null;
      return { x: t.x, y: t.y, value };
    })
    .filter((t): t is Token => t !== null);

  if (!tokens.length) return "";

  tokens.sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: Token[][] = [];
  let current: Token[] = [tokens[0]];

  for (let i = 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (Math.abs(t.y - current[0].y) <= Y_TOLERANCE) {
      current.push(t);
    } else {
      lines.push(current);
      current = [t];
    }
  }
  lines.push(current);

  const resultLines = lines.map((line) => {
    let text = line[0].value;

    for (let i = 1; i < line.length; i++) {
      const prev = line[i - 1];
      const curr = line[i];

      const prevChar = text.slice(-1);
      const nextChar = curr.value.charAt(0);

      const gap = curr.x - prev.x;

      const prevEndsSpace = prevChar === " ";
      const currStartsSpace = curr.value.startsWith(" ");

      const isWordBoundary =
        /[a-zA-Z0-9]$/.test(prevChar) && /^[a-zA-Z0-9]/.test(nextChar);

      if (prevEndsSpace || currStartsSpace) {
        text += curr.value;
      } else if (isWordBoundary) {
        text += " " + curr.value;
      } else if (gap > X_JOIN_THRESHOLD) {
        text += " " + curr.value;
      } else {
        text += curr.value;
      }
    }

    return text;
  });

  return resultLines
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function normalizeLogoFragment(fragment: string): string {
  const trimmed = fragment.trim();
  const match = trimmed.match(/^([A-Z](?:\s+[A-Z])*)(.*)$/);

  if (!match) {
    return trimmed;
  }

  const letters = match[1].replace(/\s+/g, "");
  const suffix = match[2] ?? "";

  return `${letters}${suffix}`;
}

function mergeLogoFragments(previousLine: string, fragment: string): string {
  const normalizedFragment = normalizeLogoFragment(fragment);
  const compactSuffixMatch = previousLine.match(/^(.*?)([A-Z](?:\s+[A-Z])+)\s*$/);

  if (compactSuffixMatch) {
    const prefix = compactSuffixMatch[1];
    const suffix = compactSuffixMatch[2].replace(/\s+/g, "");
    return `${prefix}${suffix}${normalizedFragment}`;
  }

  const plainSuffixMatch = previousLine.match(/^(.*\s)?([A-Z]{1,4})$/);
  if (plainSuffixMatch) {
    return `${previousLine}${normalizedFragment}`;
  }

  return `${previousLine} ${normalizedFragment}`.trim();
}

function isLogoFragmentLine(line: string): boolean {
  const trimmed = line.trim();

  if (!trimmed || /[a-z]/.test(trimmed)) {
    return false;
  }

  if (!/[A-Z]/.test(trimmed)) {
    return false;
  }

  return trimmed.length <= 8;
}

function splitLeadingLogoFragment(line: string): {
  fragment: string;
  rest: string;
} | null {
  const trimmed = line.trim();
  const match = trimmed.match(
    /^([A-Z](?:\s+[A-Z])*(?:\d+(?:\.\d+)?)?)(\s+.*)?$/,
  );

  if (!match) {
    return null;
  }

  const fragment = match[1]?.trim() ?? "";
  const rest = match[2]?.trimStart() ?? "";

  if (!fragment || fragment.length > 8 || !rest || !/[a-z]/.test(rest)) {
    return null;
  }

  return { fragment, rest };
}

function normalizeRawPageText(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const normalizedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const leadingFragment = splitLeadingLogoFragment(line);

    if (leadingFragment && normalizedLines.length > 0) {
      normalizedLines[normalizedLines.length - 1] = mergeLogoFragments(
        normalizedLines[normalizedLines.length - 1]!,
        leadingFragment.fragment,
      );
      normalizedLines.push(leadingFragment.rest);
      continue;
    }

    if (!isLogoFragmentLine(line)) {
      normalizedLines.push(line);
      continue;
    }

    let combinedFragment = normalizeLogoFragment(line);

    while (i + 1 < lines.length && isLogoFragmentLine(lines[i + 1]!.trim())) {
      i += 1;
      combinedFragment += normalizeLogoFragment(lines[i]!.trim());
    }

    if (normalizedLines.length === 0) {
      normalizedLines.push(combinedFragment);
      continue;
    }

    normalizedLines[normalizedLines.length - 1] = mergeLogoFragments(
      normalizedLines[normalizedLines.length - 1]!,
      combinedFragment,
    );
  }

  return normalizedLines
    .join("\n")
    .replace(/([A-Za-z])-\n([A-Za-z])/g, "$1$2")
    .replace(/\bL\s*A\s*T\s*E\s*X\b/g, "LATEX")
    .replace(/\bS\s*T\s*E\s*X\s*(\d+(?:\.\d+)?)\b/g, "STEX$1")
    .replace(/\bS\s*T\s*E\s*X\b/g, "STEX")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractRawPages(rawText: string, pageCount: number): string[] {
  const pages: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = PAGE_BREAK_REGEX.exec(rawText)) !== null) {
    pages.push(rawText.slice(lastIndex, match.index));
    lastIndex = PAGE_BREAK_REGEX.lastIndex;
  }

  const trailing = rawText.slice(lastIndex);
  if (trailing.trim()) {
    pages.push(trailing);
  }

  if (pages.length === pageCount) {
    return pages.map(normalizeRawPageText);
  }

  return [];
}

export async function extractPdfPages(
  buffer: Buffer,
): Promise<ExtractedPage[]> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(undefined, true);
    let finished = false;

    const originalWarn = console.warn;
    console.warn = (...args: [unknown, ...unknown[]]) => {
      const msg = String(args[0] ?? "");
      if (
        msg.includes("Unsupported: field.type") ||
        msg.includes("NOT valid form element") ||
        msg.includes("Setting up fake worker")
      )
        return;
      originalWarn(...args);
    };

    const cleanup = () => {
      console.warn = originalWarn;
    };

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        cleanup();
        parser.destroy();
        reject(new Error("PDF parsing timeout"));
      }
    }, 30000);

    parser.on("pdfParser_dataError", (err: PdfParserError) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      cleanup();
      reject(err instanceof Error ? err : err.parserError);
    });

    parser.on("pdfParser_dataReady", (pdfData: PdfData) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      cleanup();

      if (!pdfData?.Pages) {
        reject(new Error("Invalid PDF"));
        return;
      }

      const rawPages = extractRawPages(
        parser.getRawTextContent(),
        pdfData.Pages.length,
      );

      const pages: ExtractedPage[] = pdfData.Pages.map((p, i) => ({
        pageNumber: i + 1,
        text: rawPages[i] || buildPageText(p.Texts ?? []),
      }));

      resolve(pages);
    });

    parser.parseBuffer(buffer);
  });
}
