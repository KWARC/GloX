import { finishFrenchStem } from "./frenchFinalSteps";
import {
  FRENCH_STEP1,
  FRENCH_VOWELS,
  frenchRv,
  replaceSuffix,
  standardRegions,
  suffixInRegion,
} from "./frenchConfig";

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

  return finishFrenchStem(word, rv, r2, step1, rvEnding);
}
