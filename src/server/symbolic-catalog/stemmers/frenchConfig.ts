export function replaceSuffix(word: string, suffix: string, replacement: string): string {
  return `${suffix ? word.slice(0, -suffix.length) : word}${replacement}`;
}

export const FRENCH_VOWELS =
  "aeiouy\u00e2\u00e0\u00eb\u00e9\u00ea\u00e8\u00ef\u00ee\u00f4\u00fb\u00f9";
export const FRENCH_STEP1 = [
  "issements",
  "issement",
  "atrices",
  "atrice",
  "ateurs",
  "ations",
  "logies",
  "usions",
  "utions",
  "ements",
  "amment",
  "emment",
  "ances",
  "iqUes",
  "ismes",
  "ables",
  "istes",
  "ateur",
  "ation",
  "logie",
  "usion",
  "ution",
  "ences",
  "ement",
  "euses",
  "ments",
  "ance",
  "iqUe",
  "isme",
  "able",
  "iste",
  "ence",
  "it\u00e9s",
  "ives",
  "eaux",
  "euse",
  "ment",
  "eux",
  "it\u00e9",
  "ive",
  "ifs",
  "aux",
  "if",
] as const;
export const FRENCH_STEP2A = [
  "issaIent",
  "issantes",
  "iraIent",
  "issante",
  "issants",
  "issions",
  "irions",
  "issais",
  "issait",
  "issant",
  "issent",
  "issiez",
  "issons",
  "irais",
  "irait",
  "irent",
  "iriez",
  "irons",
  "iront",
  "isses",
  "issez",
  "\u00eemes",
  "\u00eetes",
  "irai",
  "iras",
  "irez",
  "isse",
  "ies",
  "ira",
  "\u00eet",
  "ie",
  "ir",
  "is",
  "it",
  "i",
] as const;
export const FRENCH_STEP2B = [
  "eraIent",
  "assions",
  "erions",
  "assent",
  "assiez",
  "\u00e8rent",
  "erais",
  "erait",
  "eriez",
  "erons",
  "eront",
  "aIent",
  "antes",
  "asses",
  "ions",
  "erai",
  "eras",
  "erez",
  "\u00e2mes",
  "\u00e2tes",
  "ante",
  "ants",
  "asse",
  "\u00e9es",
  "era",
  "iez",
  "ais",
  "ait",
  "ant",
  "\u00e9e",
  "\u00e9s",
  "er",
  "ez",
  "\u00e2t",
  "ai",
  "as",
  "\u00e9",
  "a",
] as const;

export function standardRegions(word: string, vowels: string): [string, string] {
  let r1 = "";
  let r2 = "";
  for (let index = 1; index < word.length; index += 1) {
    if (!vowels.includes(word[index]) && vowels.includes(word[index - 1])) {
      r1 = word.slice(index + 1);
      break;
    }
  }
  for (let index = 1; index < r1.length; index += 1) {
    if (!vowels.includes(r1[index]) && vowels.includes(r1[index - 1])) {
      r2 = r1.slice(index + 1);
      break;
    }
  }
  return [r1, r2];
}

export function frenchRv(word: string): string {
  if (word.length < 2) return "";
  if (
    word.startsWith("par") ||
    word.startsWith("col") ||
    word.startsWith("tap") ||
    (FRENCH_VOWELS.includes(word[0]) && FRENCH_VOWELS.includes(word[1]))
  ) {
    return word.slice(3);
  }
  for (let index = 1; index < word.length; index += 1) {
    if (FRENCH_VOWELS.includes(word[index])) return word.slice(index + 1);
  }
  return "";
}

export function suffixInRegion(region: string, suffix: string): boolean {
  return region.includes(suffix);
}
