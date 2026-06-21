export function stemGerman(word: string): string {
  if (!word) return "";
  let stem = word
    .toLowerCase()
    .replaceAll("\u00fc", "u")
    .replaceAll("\u00f6", "o")
    .replaceAll("\u00e4", "a")
    .replaceAll("\u00df", "ss")
    .replace(/^ge(.{4,})$/, "$1")
    .replaceAll("sch", "$")
    .replaceAll("ei", "%")
    .replaceAll("ie", "&")
    .replace(/(.)\1/g, "$1*");

  while (stem.length > 3) {
    if (stem.length > 5 && /e[mr]$/.test(stem)) {
      stem = stem.slice(0, -2);
      continue;
    }
    if (stem.length > 5 && stem.endsWith("nd")) {
      stem = stem.slice(0, -2);
      continue;
    }
    if (stem.endsWith("t")) {
      stem = stem.slice(0, -1);
      continue;
    }
    if (/[esn]$/.test(stem)) {
      stem = stem.slice(0, -1);
      continue;
    }
    break;
  }

  return stem
    .replace(/(.)\*/g, "$1$1")
    .replaceAll("%", "ei")
    .replaceAll("&", "ie")
    .replaceAll("$", "sch");
}
