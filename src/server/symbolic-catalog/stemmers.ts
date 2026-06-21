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

const FRENCH_VOWELS =
  "aeiouy\u00e2\u00e0\u00eb\u00e9\u00ea\u00e8\u00ef\u00ee\u00f4\u00fb\u00f9";
const FRENCH_STEP1 = [
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
const FRENCH_STEP2A = [
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
const FRENCH_STEP2B = [
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

function standardRegions(word: string, vowels: string): [string, string] {
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

function frenchRv(word: string): string {
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

function suffixInRegion(region: string, suffix: string): boolean {
  return region.includes(suffix);
}

export function stemFrench(input: string): string {
  let word = input.toLowerCase();
  for (let index = 1; index < word.length; index += 1) {
    if (word[index - 1] === "q" && word[index] === "u") {
      word = `${word.slice(0, index)}U${word.slice(index + 1)}`;
    }
  }
  for (let index = 1; index < word.length - 1; index += 1) {
    const surroundedByVowels =
      FRENCH_VOWELS.includes(word[index - 1]) &&
      FRENCH_VOWELS.includes(word[index + 1]);
    if (surroundedByVowels && word[index] === "u")
      word = `${word.slice(0, index)}U${word.slice(index + 1)}`;
    else if (surroundedByVowels && word[index] === "i")
      word = `${word.slice(0, index)}I${word.slice(index + 1)}`;
    if (
      word[index] === "y" &&
      (FRENCH_VOWELS.includes(word[index - 1]) ||
        FRENCH_VOWELS.includes(word[index + 1]))
    ) {
      word = `${word.slice(0, index)}Y${word.slice(index + 1)}`;
    }
  }

  const [r1, r2] = standardRegions(word, FRENCH_VOWELS);
  let rv = frenchRv(word);
  let step1 = false;
  let rvEnding = false;
  let step2a = false;
  let step2b = false;

  for (const suffix of FRENCH_STEP1) {
    if (!word.endsWith(suffix)) continue;
    if (suffix === "eaux") {
      word = word.slice(0, -1);
      step1 = true;
    } else if (suffix === "euse" || suffix === "euses") {
      if (suffixInRegion(r2, suffix)) {
        word = word.slice(0, -suffix.length);
        step1 = true;
      } else if (suffixInRegion(r1, suffix)) {
        word = replaceSuffix(word, suffix, "eux");
        step1 = true;
      }
    } else if (
      (suffix === "ement" || suffix === "ements") &&
      suffixInRegion(rv, suffix)
    ) {
      word = word.slice(0, -suffix.length);
      step1 = true;
      if (word.endsWith("iv") && suffixInRegion(r2, "iv")) {
        word = word.slice(0, -2);
        if (word.endsWith("at") && suffixInRegion(r2, "at"))
          word = word.slice(0, -2);
      } else if (word.endsWith("eus")) {
        if (suffixInRegion(r2, "eus")) word = word.slice(0, -3);
        else if (suffixInRegion(r1, "eus")) word = `${word.slice(0, -1)}x`;
      } else if (
        (word.endsWith("abl") && suffixInRegion(r2, "abl")) ||
        (word.endsWith("iqU") && suffixInRegion(r2, "iqU"))
      ) {
        word = word.slice(0, -3);
      } else if (
        (word.endsWith("i\u00e8r") && suffixInRegion(rv, "i\u00e8r")) ||
        (word.endsWith("I\u00e8r") && suffixInRegion(rv, "I\u00e8r"))
      ) {
        word = `${word.slice(0, -3)}i`;
      }
    } else if (suffix === "amment" && suffixInRegion(rv, suffix)) {
      word = replaceSuffix(word, suffix, "ant");
      rv = replaceSuffix(rv, suffix, "ant");
      rvEnding = true;
    } else if (suffix === "emment" && suffixInRegion(rv, suffix)) {
      word = replaceSuffix(word, suffix, "ent");
      rvEnding = true;
    } else if (
      (suffix === "ment" || suffix === "ments") &&
      suffixInRegion(rv, suffix) &&
      !rv.startsWith(suffix) &&
      FRENCH_VOWELS.includes(rv[rv.lastIndexOf(suffix) - 1])
    ) {
      word = word.slice(0, -suffix.length);
      rv = rv.slice(0, -suffix.length);
      rvEnding = true;
    } else if (suffix === "aux" && suffixInRegion(r1, suffix)) {
      word = `${word.slice(0, -2)}l`;
      step1 = true;
    } else if (
      (suffix === "issement" || suffix === "issements") &&
      suffixInRegion(r1, suffix) &&
      !FRENCH_VOWELS.includes(word.at(-suffix.length - 1) ?? "")
    ) {
      word = word.slice(0, -suffix.length);
      step1 = true;
    } else if (
      [
        "ance",
        "iqUe",
        "isme",
        "able",
        "iste",
        "eux",
        "ances",
        "iqUes",
        "ismes",
        "ables",
        "istes",
      ].includes(suffix) &&
      suffixInRegion(r2, suffix)
    ) {
      word = word.slice(0, -suffix.length);
      step1 = true;
    } else if (
      ["atrice", "ateur", "ation", "atrices", "ateurs", "ations"].includes(
        suffix,
      ) &&
      suffixInRegion(r2, suffix)
    ) {
      word = word.slice(0, -suffix.length);
      step1 = true;
      if (word.endsWith("ic"))
        word = suffixInRegion(r2, "ic")
          ? word.slice(0, -2)
          : `${word.slice(0, -2)}iqU`;
    } else if (
      (suffix === "logie" || suffix === "logies") &&
      suffixInRegion(r2, suffix)
    ) {
      word = replaceSuffix(word, suffix, "log");
      step1 = true;
    } else if (
      ["usion", "ution", "usions", "utions"].includes(suffix) &&
      suffixInRegion(r2, suffix)
    ) {
      word = replaceSuffix(word, suffix, "u");
      step1 = true;
    } else if (
      (suffix === "ence" || suffix === "ences") &&
      suffixInRegion(r2, suffix)
    ) {
      word = replaceSuffix(word, suffix, "ent");
      step1 = true;
    } else if (
      (suffix === "it\u00e9" || suffix === "it\u00e9s") &&
      suffixInRegion(r2, suffix)
    ) {
      word = word.slice(0, -suffix.length);
      step1 = true;
      if (word.endsWith("abil"))
        word = suffixInRegion(r2, "abil")
          ? word.slice(0, -4)
          : `${word.slice(0, -2)}l`;
      else if (word.endsWith("ic"))
        word = suffixInRegion(r2, "ic")
          ? word.slice(0, -2)
          : `${word.slice(0, -2)}iqU`;
      else if (word.endsWith("iv") && suffixInRegion(r2, "iv"))
        word = word.slice(0, -2);
    } else if (
      ["if", "ive", "ifs", "ives"].includes(suffix) &&
      suffixInRegion(r2, suffix)
    ) {
      word = word.slice(0, -suffix.length);
      step1 = true;
      if (word.endsWith("at") && suffixInRegion(r2, "at")) {
        word = word.slice(0, -2);
        if (word.endsWith("ic"))
          word = suffixInRegion(r2, "ic")
            ? word.slice(0, -2)
            : `${word.slice(0, -2)}iqU`;
      }
    }
    break;
  }

  if (!step1 || rvEnding) {
    for (const suffix of FRENCH_STEP2A) {
      if (!word.endsWith(suffix)) continue;
      const at = rv.lastIndexOf(suffix);
      if (
        suffixInRegion(rv, suffix) &&
        rv.length > suffix.length &&
        !FRENCH_VOWELS.includes(rv[at - 1])
      ) {
        word = word.slice(0, -suffix.length);
        step2a = true;
      }
      break;
    }
    if (!step2a) {
      for (const suffix of FRENCH_STEP2B) {
        if (!rv.endsWith(suffix)) continue;
        if (suffix === "ions" && suffixInRegion(r2, suffix)) {
          word = word.slice(0, -4);
          step2b = true;
        } else if (
          [
            "eraIent",
            "erions",
            "\u00e8rent",
            "erais",
            "erait",
            "eriez",
            "erons",
            "eront",
            "erai",
            "eras",
            "erez",
            "\u00e9es",
            "era",
            "iez",
            "\u00e9e",
            "\u00e9s",
            "er",
            "ez",
            "\u00e9",
          ].includes(suffix)
        ) {
          word = word.slice(0, -suffix.length);
          step2b = true;
        } else {
          word = word.slice(0, -suffix.length);
          rv = rv.slice(0, -suffix.length);
          step2b = true;
          if (rv.endsWith("e")) word = word.slice(0, -1);
        }
        break;
      }
    }
  }

  if (step1 || step2a || step2b) {
    if (word.endsWith("Y")) word = `${word.slice(0, -1)}i`;
    else if (word.endsWith("\u00e7")) word = `${word.slice(0, -1)}c`;
  } else {
    if (
      word.length >= 2 &&
      word.endsWith("s") &&
      !"aiou\u00e8s".includes(word.at(-2) ?? "")
    ) {
      word = word.slice(0, -1);
    }
    for (const suffix of [
      "i\u00e8re",
      "I\u00e8re",
      "ion",
      "ier",
      "Ier",
      "e",
      "\u00eb",
    ] as const) {
      if (!word.endsWith(suffix)) continue;
      if (suffixInRegion(rv, suffix)) {
        if (
          suffix === "ion" &&
          suffixInRegion(r2, suffix) &&
          "st".includes(rv.at(-4) ?? "")
        )
          word = word.slice(0, -3);
        else if (["ier", "i\u00e8re", "Ier", "I\u00e8re"].includes(suffix))
          word = replaceSuffix(word, suffix, "i");
        else if (suffix === "e") word = word.slice(0, -1);
        else if (suffix === "\u00eb" && word.slice(-3, -1) === "gu")
          word = word.slice(0, -1);
      }
      break;
    }
  }

  if (
    ["enn", "onn", "ett", "ell", "eill"].some((suffix) => word.endsWith(suffix))
  )
    word = word.slice(0, -1);
  for (let offset = 1; offset < word.length; offset += 1) {
    if (!FRENCH_VOWELS.includes(word.at(-offset) ?? "")) continue;
    if (offset !== 1 && "\u00e9\u00e8".includes(word.at(-offset) ?? "")) {
      word = `${word.slice(0, -offset)}e${word.slice(-offset + 1)}`;
    }
    break;
  }
  return word.replaceAll("I", "i").replaceAll("U", "u").replaceAll("Y", "y");
}

export function stemWord(word: string, lang: string): string {
  if (word.toUpperCase() === word && word.toLowerCase() !== word) return word;
  if (lang === "en" && word.endsWith("s")) {
    const singular = word.slice(0, -1);
    if (
      singular.toUpperCase() === singular &&
      singular.toLowerCase() !== singular
    )
      return singular;
  }
  if (lang === "en") return stemEnglish(word);
  if (lang === "de") return stemGerman(word).toLowerCase();
  if (lang === "fr") return stemFrench(word);
  return word;
}
