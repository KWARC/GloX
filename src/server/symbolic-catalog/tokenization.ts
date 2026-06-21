import { stemWord } from "./stemmers";

export type StemmedToken = {
  stem: string;
  start: number;
  end: number;
};

export function stringToStemmedWordSequence(
  string: string,
  lang = "en",
): StemmedToken[] {
  const normalized = normalizeSpacesWithRefs(string);
  const tokens: StemmedToken[] = [];
  const re = /[\p{L}\p{N}_]+/gu;
  let match: RegExpExecArray | null;

  while ((match = re.exec(normalized.text)) !== null) {
    const raw = match[0];
    tokens.push({
      stem: stemWord(raw, lang),
      start: normalized.startRefs[match.index],
      end: normalized.endRefs[match.index + raw.length - 1],
    });
  }

  return tokens;
}

export function stringToStemmedWordSequenceSimplified(
  string: string,
  lang = "en",
): string[] {
  const words: string[] = [];
  const re = /[\p{L}\p{N}_]+/gu;
  let match: RegExpExecArray | null;

  while ((match = re.exec(string)) !== null) {
    words.push(stemWord(match[0], lang));
  }

  return words;
}

function normalizeSpacesWithRefs(string: string) {
  let text = "";
  const startRefs: number[] = [];
  const endRefs: number[] = [];
  let index = 0;

  while (index < string.length) {
    const char = string[index];

    if (/\s/u.test(char)) {
      const start = index;
      while (index < string.length && /\s/u.test(string[index])) index += 1;
      text += " ";
      startRefs.push(start);
      endRefs.push(index);
      continue;
    }

    text += char;
    startRefs.push(index);
    endRefs.push(index + 1);
    index += 1;
  }

  return { text, startRefs, endRefs };
}
