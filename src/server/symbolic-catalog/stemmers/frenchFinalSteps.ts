import {
  FRENCH_STEP2A,
  FRENCH_STEP2B,
  FRENCH_VOWELS,
  replaceSuffix,
  suffixInRegion,
} from "./frenchConfig";

export function finishFrenchStem(
  word: string,
  rv: string,
  r2: string,
  step1: boolean,
  rvEnding: boolean,
): string {
  let step2a = false;
  let step2b = false;
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
