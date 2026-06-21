import { stemEnglish } from "./stemmers/english";
import { stemFrench } from "./stemmers/french";
import { stemGerman } from "./stemmers/german";

export { stemEnglish, stemFrench, stemGerman };

export function stemWord(word: string, lang: string): string {
  if (word.toUpperCase() === word && word.toLowerCase() !== word) return word;
  if (lang === "en" && word.endsWith("s")) {
    const singular = word.slice(0, -1);
    if (
      singular.toUpperCase() === singular &&
      singular.toLowerCase() !== singular
    ) {
      return singular;
    }
  }
  if (lang === "en") return stemEnglish(word);
  if (lang === "de") return stemGerman(word).toLowerCase();
  if (lang === "fr") return stemFrench(word);
  return word;
}
