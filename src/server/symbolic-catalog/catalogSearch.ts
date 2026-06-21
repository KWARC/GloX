import { stemWord } from "./stemmers";

export class Verbalization {
  constructor(readonly verb: string) {}
}

export type StemmedToken = {
  stem: string;
  start: number;
  end: number;
};

export type CatalogMatch<S, V extends Verbalization> = {
  start: number;
  end: number;
  candidates: Array<[S, V]>;
};

type SymbolVerbBucket<S, V extends Verbalization> = {
  symbol: S;
  verbs: V[];
};

export class Trie<S, V extends Verbalization> {
  readonly children = new Map<string, Trie<S, V>>();
  readonly verbs = new Map<string, SymbolVerbBucket<S, V>>();

  insert(key: Iterable<string>, symb: S, verb: V, symbKey: string) {
    let node: Trie<S, V> = this;

    for (const token of key) {
      let child = node.children.get(token);
      if (!child) {
        child = new Trie<S, V>();
        node.children.set(token, child);
      }
      node = child;
    }

    const bucket = node.verbs.get(symbKey) ?? { symbol: symb, verbs: [] };
    bucket.verbs.push(verb);
    node.verbs.set(symbKey, bucket);
  }

  get(key: Iterable<string>): Map<string, SymbolVerbBucket<S, V>> {
    let node: Trie<S, V> = this;

    for (const token of key) {
      const child = node.children.get(token);
      if (!child) return new Map<string, SymbolVerbBucket<S, V>>();
      node = child;
    }

    return node.verbs;
  }
}

export class Catalog<S, V extends Verbalization> {
  readonly trie = new Trie<S, V>();
  readonly symbToVerb = new Map<string, SymbolVerbBucket<S, V>>();

  constructor(
    readonly lang: string,
    private readonly getSymbolKey: (symbol: S) => string,
    symbverbs?: Iterable<[S, V]>,
  ) {
    if (symbverbs) {
      for (const [symb, verb] of symbverbs) {
        this.addSymbVerb(symb, verb);
      }
    }
  }

  symbIter(): Iterable<S> {
    return Array.from(this.symbToVerb.values(), (bucket) => bucket.symbol);
  }

  getSymbVerbs(symb: S): V[] {
    return this.symbToVerb.get(this.getSymbolKey(symb))?.verbs ?? [];
  }

  addSymbVerb(symb: S, verb: V) {
    const symbKey = this.getSymbolKey(symb);
    const bucket = this.symbToVerb.get(symbKey) ?? { symbol: symb, verbs: [] };
    bucket.verbs.push(verb);
    this.symbToVerb.set(symbKey, bucket);

    const key = stringToStemmedWordSequenceSimplified(verb.verb, this.lang);
    this.trie.insert(key, symb, verb, symbKey);
  }

  addSymb(symb: S) {
    const symbKey = this.getSymbolKey(symb);
    if (!this.symbToVerb.has(symbKey)) {
      this.symbToVerb.set(symbKey, { symbol: symb, verbs: [] });
    }
  }

  subCatalogForStem(stem: string): Catalog<S, V> {
    const stemSeq = stringToStemmedWordSequenceSimplified(stem, this.lang);
    const remaining: Array<[string, S, V]> = [];
    const result = this.trie.get(stemSeq);

    for (const { symbol, verbs } of result.values()) {
      for (const verb of verbs) {
        remaining.push([this.lang, symbol, verb]);
      }
    }

    return (
      catalogsFromStream(remaining, this.getSymbolKey).get(this.lang) ??
      new Catalog<S, V>(this.lang, this.getSymbolKey)
    );
  }

  findFirstMatch(
    string: string,
    options: {
      stemsToIgnore?: Set<string>;
      wordsToIgnore?: Set<string>;
      symbolsToIgnore?: Set<string>;
    } = {},
  ): CatalogMatch<S, V> | null {
    const seq = stringToStemmedWordSequence(string, this.lang);
    let matchStart = 0;

    while (matchStart < seq.length) {
      let j = matchStart;
      let trie = this.trie;
      let result: CatalogMatch<S, V> | null = null;

      while (j < seq.length && trie.children.has(seq[j].stem)) {
        const child = trie.children.get(seq[j].stem);
        if (!child) break;
        trie = child;

        if (trie.verbs.size > 0) {
          let isValidMatch = true;
          const originalWord = string
            .slice(seq[matchStart].start, seq[j].end)
            .replace(/\s+/g, " ");
          const stemPhrase = seq
            .slice(matchStart, j + 1)
            .map((token) => token.stem)
            .join(" ");

          if (options.wordsToIgnore?.has(originalWord)) {
            isValidMatch = false;
          } else if (options.stemsToIgnore?.has(stemPhrase)) {
            isValidMatch = false;
          }

          if (isValidMatch) {
            const symbols: Array<[S, V]> = [];

            for (const [symbKey, { symbol, verbs }] of trie.verbs.entries()) {
              if (!options.symbolsToIgnore?.has(symbKey) && verbs[0]) {
                symbols.push([symbol, verbs[0]]);
              }
            }

            if (symbols.length > 0) {
              result = {
                start: seq[matchStart].start,
                end: seq[j].end,
                candidates: symbols,
              };
            }
          }
        }

        j += 1;
      }

      if (result) return result;
      matchStart += 1;
    }

    return null;
  }

  withoutSymbols(removePredicate: (symbol: S) => boolean): Catalog<S, V> {
    const newCatalog = new Catalog<S, V>(this.lang, this.getSymbolKey);

    for (const { symbol, verbs } of this.symbToVerb.values()) {
      if (removePredicate(symbol)) continue;
      newCatalog.addSymb(symbol);
      for (const verb of verbs) {
        newCatalog.addSymbVerb(symbol, verb);
      }
    }

    return newCatalog;
  }
}

export function catalogsFromStream<S, V extends Verbalization>(
  stream: Iterable<[string, S, V]>,
  getSymbolKey: (symbol: S) => string,
  symbols: Iterable<S> = [],
): Map<string, Catalog<S, V>> {
  const catalogs = new Map<string, Catalog<S, V>>();

  for (const [lang, symb, verb] of stream) {
    let catalog = catalogs.get(lang);
    if (!catalog) {
      catalog = new Catalog<S, V>(lang, getSymbolKey);
      for (const symbol of symbols) {
        catalog.addSymb(symbol);
      }
      catalogs.set(lang, catalog);
    }
    catalog.addSymbVerb(symb, verb);
  }

  return catalogs;
}

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
      while (index < string.length && /\s/u.test(string[index])) {
        index += 1;
      }
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

export { stemWord };
