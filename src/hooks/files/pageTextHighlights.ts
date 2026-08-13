export type PageTextHighlightSource = "extract" | "reference";

export type PageTextHighlightMatch = {
  text: string | null | undefined;
  source: PageTextHighlightSource;
  label: string;
};

export type PageTextHighlightSegment = {
  content: string;
  extract: boolean;
  reference: boolean;
  extractLabel?: string;
  referenceLabel?: string;
};

function makeWhitespaceTolerantPattern(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
}

export function getPageTextHighlightSegments(
  pageText: string,
  matches: PageTextHighlightMatch[],
): PageTextHighlightSegment[] {
  const ranges = matches.flatMap(({ text, source, label }) => {
    const pattern = text ? makeWhitespaceTolerantPattern(text) : "";
    if (!pattern) return [];

    const expression = new RegExp(pattern, "gi");
    const match = expression.exec(pageText);
    if (!match) return [];

    return [
      {
        start: match.index,
        end: match.index + match[0].length,
        source,
        label,
      },
    ];
  });

  if (ranges.length === 0) {
    return [
      {
        content: pageText,
        extract: false,
        reference: false,
      },
    ];
  }

  const boundaries = Array.from(
    new Set(ranges.flatMap((range) => [range.start, range.end])),
  ).sort((a, b) => a - b);
  const segments: PageTextHighlightSegment[] = [];
  let cursor = 0;

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];

    if (cursor < start) {
      segments.push({
        content: pageText.slice(cursor, start),
        extract: false,
        reference: false,
      });
    }

    const active = ranges.filter((range) => range.start < end && range.end > start);
    segments.push({
      content: pageText.slice(start, end),
      extract: active.some((range) => range.source === "extract"),
      reference: active.some((range) => range.source === "reference"),
      extractLabel: active.find((range) => range.source === "extract")
        ?.label,
      referenceLabel: active.find((range) => range.source === "reference")?.label,
    });
    cursor = end;
  }

  if (cursor < pageText.length) {
    segments.push({
      content: pageText.slice(cursor),
      extract: false,
      reference: false,
    });
  }

  return segments.filter((segment) => segment.content.length > 0);
}
