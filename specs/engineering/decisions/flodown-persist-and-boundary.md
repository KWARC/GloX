---
id: flodown-persist-and-boundary
status: Accepted
deciders: GloX maintainers
related_sdd:
  - specs/engineering/features/flodown-blocks/lifecycle.md
  - specs/engineering/features/curation-export/stex-export.md
  - specs/engineering/features/module-descriptions/export.md
related_prd:
  - specs/prds/domains/flodown-blocks.md
  - specs/prds/domains/curation-export.md
  - specs/prds/domains/module-descriptions.md
code:
  - src/lib/prepareFloDownStatement.ts
  - src/lib/flodownUris.ts
  - src/components/FtmlPreview.tsx
  - src/server/ftml/declaredSymbols.ts
---

# Decisions: FloDown persist vs FloDown runtime

Locked choices after the FloDown lab and the production preview/export cleanup. Wiring lives in the
related SDDs and [`ftml.md`](../external-deps/libraries/ftml.md). Cite **`D-FTML-*` atoms**.

## Context

GloX stores FloDown block statements as FTML JSON with **short local symbol names**. FloDown WASM
only accepts HTTP symbol URIs (MathHub form or the string returned by `addSymbolDeclaration`). Mixing
those two worlds in the database, or inventing document URIs after `fromPath` panics, caused preview
and export failures and later mixed extracted definitions into Title, Inhalt, and Lernziele.

## Decision atoms

**D-FTML-01:** The database MUST keep local `uri` values as short `symbolName` strings. Full FloDown
symbol URIs MUST be produced only at the FloDown boundary (`rewriteStatementForFloDown` /
`mountStatementOnFloDown`) and MUST NOT be written back into `statement` JSON.

**D-FTML-02:** Production MUST create FloDown documents with `fromUri` and the vendor document URI
`http://mathhub.info?a={archive}&p={path}&d={name}&l={lang}` (omit `p=` when path is empty). Local
DB rows use that row’s `futureRepo` / `filePath` / `fileName` / `language` (`a=courses/FAU/…` when
that is the archive). Previews without a row identity MAY use
`http://mathhub.info?a=no/archive&d={id}&l={lang}`. Production MUST NOT emit `http://test…` or
`http://unknown.source…`. Production MUST NOT call `fromPath`.

**D-FTML-03:** FTML preview MUST mount only the current statement on the visible FloDown document.
Definition bodies needed so a **symref** can show hover text MUST live on a second live FloDown
document (hidden in the UI). Visible and hidden documents MUST share the URI returned by
`addSymbolDeclaration` on the document that holds the **declaration** (or a known URI of that
declaration) — not a new declaration on the visible document.

**D-FTML-04:** `FloDownBlock.declaredSymbols` MUST record names this block **declares** (E-FTML-06).
The system MUST NOT treat every definiendum `uri` as a declaration. Persist MUST NOT fill an empty
`declaredSymbols` array from definienda.

## Why (rationale)

Rejected: persisting MathHub URIs in every statement (export-identity moves would rewrite JSON;
cascade delete already keys off short names). Rejected: `fromPath` (WASM panics on language
encodings we tried). Rejected: inverted host `http://{futureRepo}?a={path}` as the encoding we
generate (WASM may accept it; it is not the vendor contract). Rejected: `unknown.source` / `http://test`
scratch documents for local DB previews. Rejected: putting sibling definitions
on the visible document so hover works (Title/Inhalt/Lernziele showed those definitions).

## Consequences

- Persist `for_symbols` is emptied on save; FloDown still requires the key at `addElement` — the
  rewrite supplies definiendum URIs (symbols this definition is **for**, declared here or imported)
  or `[]`.
- `declaredSymbols` is updated only via `symdecl: true` / `addDeclaredSymbol` (and explicit
  `setDeclaredSymbols` of that list). Persist MUST NOT copy definienda into the column.
- Hover for a local symbol works when a live FloDown document has declared it and mounted a
  definition (`addSymbolDeclaration` + `addElement`). Otherwise FloDown requests MathHub
  `/content/fragment` (404 for GloX-local names).
- Mark-reference LaTeX and `finalFloDown` still rewrite URIs on their own paths — follow-on to fold
  them into `prepareFloDownStatement` if they stay in use.
