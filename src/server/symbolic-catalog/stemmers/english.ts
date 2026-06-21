type PorterCondition = (stem: string) => boolean;
type PorterRule = readonly [
  suffix: string,
  replacement: string,
  condition?: PorterCondition,
];

const PORTER_IRREGULAR = new Map<string, string>([
  ["sky", "sky"],
  ["skies", "sky"],
  ["dying", "die"],
  ["lying", "lie"],
  ["tying", "tie"],
  ["news", "news"],
  ["innings", "inning"],
  ["inning", "inning"],
  ["outings", "outing"],
  ["outing", "outing"],
  ["cannings", "canning"],
  ["canning", "canning"],
  ["howe", "howe"],
  ["proceed", "proceed"],
  ["exceed", "exceed"],
  ["succeed", "succeed"],
]);

function porterIsConsonant(word: string, index: number): boolean {
  const char = word[index];
  if ("aeiou".includes(char)) return false;
  if (char === "y") return index === 0 || !porterIsConsonant(word, index - 1);
  return true;
}

function porterMeasure(stem: string): number {
  let measure = 0;
  for (let index = 1; index < stem.length; index += 1) {
    if (!porterIsConsonant(stem, index - 1) && porterIsConsonant(stem, index)) {
      measure += 1;
    }
  }
  return measure;
}

function porterContainsVowel(stem: string): boolean {
  return Array.from(stem, (_, index) => index).some(
    (index) => !porterIsConsonant(stem, index),
  );
}

function porterEndsDoubleConsonant(word: string): boolean {
  return (
    word.length >= 2 &&
    word.at(-1) === word.at(-2) &&
    porterIsConsonant(word, word.length - 1)
  );
}

function porterEndsCvc(word: string): boolean {
  if (word.length === 2) {
    return !porterIsConsonant(word, 0) && porterIsConsonant(word, 1);
  }
  if (word.length < 3) return false;
  return (
    porterIsConsonant(word, word.length - 3) &&
    !porterIsConsonant(word, word.length - 2) &&
    porterIsConsonant(word, word.length - 1) &&
    !"wxy".includes(word.at(-1) ?? "")
  );
}

function replaceSuffix(
  word: string,
  suffix: string,
  replacement: string,
): string {
  return `${suffix ? word.slice(0, -suffix.length) : word}${replacement}`;
}

function applyPorterRules(word: string, rules: readonly PorterRule[]): string {
  for (const [suffix, replacement, condition] of rules) {
    if (suffix === "*d") {
      if (!porterEndsDoubleConsonant(word)) continue;
      const stem = word.slice(0, -2);
      return !condition || condition(stem) ? stem + replacement : word;
    }
    if (!word.endsWith(suffix)) continue;
    const stem = replaceSuffix(word, suffix, "");
    return !condition || condition(stem) ? stem + replacement : word;
  }
  return word;
}

function porterStep1a(word: string): string {
  if (word.endsWith("ies") && word.length === 4)
    return replaceSuffix(word, "ies", "ie");
  return applyPorterRules(word, [
    ["sses", "ss"],
    ["ies", "i"],
    ["ss", "ss"],
    ["s", ""],
  ]);
}

function porterStep1b(word: string): string {
  if (word.endsWith("ied"))
    return replaceSuffix(word, "ied", word.length === 4 ? "ie" : "i");
  if (word.endsWith("eed")) {
    const stem = replaceSuffix(word, "eed", "");
    return porterMeasure(stem) > 0 ? `${stem}ee` : word;
  }

  let stem: string | null = null;
  for (const suffix of ["ed", "ing"] as const) {
    if (word.endsWith(suffix)) {
      const candidate = replaceSuffix(word, suffix, "");
      if (porterContainsVowel(candidate)) stem = candidate;
      break;
    }
  }
  if (stem === null) return word;

  const finalChar = stem.at(-1) ?? "";
  return applyPorterRules(stem, [
    ["at", "ate"],
    ["bl", "ble"],
    ["iz", "ize"],
    ["*d", finalChar, () => !"lsz".includes(finalChar)],
    [
      "",
      "e",
      (candidate) => porterMeasure(candidate) === 1 && porterEndsCvc(candidate),
    ],
  ]);
}

function porterStep1c(word: string): string {
  return applyPorterRules(word, [
    [
      "y",
      "i",
      (stem) => stem.length > 1 && porterIsConsonant(stem, stem.length - 1),
    ],
  ]);
}

function porterStep2(word: string): string {
  const positive = (stem: string) => porterMeasure(stem) > 0;
  if (word.endsWith("alli") && positive(replaceSuffix(word, "alli", ""))) {
    return porterStep2(replaceSuffix(word, "alli", "al"));
  }
  return applyPorterRules(word, [
    ["ational", "ate", positive],
    ["tional", "tion", positive],
    ["enci", "ence", positive],
    ["anci", "ance", positive],
    ["izer", "ize", positive],
    ["bli", "ble", positive],
    ["alli", "al", positive],
    ["entli", "ent", positive],
    ["eli", "e", positive],
    ["ousli", "ous", positive],
    ["ization", "ize", positive],
    ["ation", "ate", positive],
    ["ator", "ate", positive],
    ["alism", "al", positive],
    ["iveness", "ive", positive],
    ["fulness", "ful", positive],
    ["ousness", "ous", positive],
    ["aliti", "al", positive],
    ["iviti", "ive", positive],
    ["biliti", "ble", positive],
    ["fulli", "ful", positive],
    ["logi", "log", () => positive(word.slice(0, -3))],
  ]);
}

function porterStep3(word: string): string {
  const positive = (stem: string) => porterMeasure(stem) > 0;
  return applyPorterRules(word, [
    ["icate", "ic", positive],
    ["ative", "", positive],
    ["alize", "al", positive],
    ["iciti", "ic", positive],
    ["ical", "ic", positive],
    ["ful", "", positive],
    ["ness", "", positive],
  ]);
}

function porterStep4(word: string): string {
  const measureGreaterThanOne = (stem: string) => porterMeasure(stem) > 1;
  return applyPorterRules(word, [
    ["al", "", measureGreaterThanOne],
    ["ance", "", measureGreaterThanOne],
    ["ence", "", measureGreaterThanOne],
    ["er", "", measureGreaterThanOne],
    ["ic", "", measureGreaterThanOne],
    ["able", "", measureGreaterThanOne],
    ["ible", "", measureGreaterThanOne],
    ["ant", "", measureGreaterThanOne],
    ["ement", "", measureGreaterThanOne],
    ["ment", "", measureGreaterThanOne],
    ["ent", "", measureGreaterThanOne],
    [
      "ion",
      "",
      (stem) => porterMeasure(stem) > 1 && "st".includes(stem.at(-1) ?? ""),
    ],
    ["ou", "", measureGreaterThanOne],
    ["ism", "", measureGreaterThanOne],
    ["ate", "", measureGreaterThanOne],
    ["iti", "", measureGreaterThanOne],
    ["ous", "", measureGreaterThanOne],
    ["ive", "", measureGreaterThanOne],
    ["ize", "", measureGreaterThanOne],
  ]);
}

function porterStep5a(word: string): string {
  if (!word.endsWith("e")) return word;
  const stem = word.slice(0, -1);
  const measure = porterMeasure(stem);
  return measure > 1 || (measure === 1 && !porterEndsCvc(stem)) ? stem : word;
}

export function stemEnglish(word: string): string {
  const lower = word.toLowerCase();
  const irregular = PORTER_IRREGULAR.get(word);
  if (irregular) return irregular;
  if (word.length <= 2) return lower;

  let stem = porterStep1a(lower);
  stem = porterStep1b(stem);
  stem = porterStep1c(stem);
  stem = porterStep2(stem);
  stem = porterStep3(stem);
  stem = porterStep4(stem);
  stem = porterStep5a(stem);
  return applyPorterRules(stem, [
    ["ll", "l", () => porterMeasure(stem.slice(0, -1)) > 1],
  ]);
}

