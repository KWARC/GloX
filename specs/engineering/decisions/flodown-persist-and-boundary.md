---
id: flodown-persist-and-boundary
status: Accepted
deciders: GloX maintainers
related_sdd:
  - specs/engineering/features/flodown-blocks/lifecycle.md
  - specs/engineering/features/symbols-semantics/registry.md
  - specs/engineering/features/curation-export/stex-export.md
  - specs/engineering/features/module-descriptions/export.md
related_prd:
  - specs/prds/domains/flodown-blocks.md
  - specs/prds/domains/symbols-semantics.md
  - specs/prds/domains/curation-export.md
  - specs/prds/domains/module-descriptions.md
code:
  - src/lib/prepareFloDownStatement.ts
  - src/lib/flodownUris.ts
  - src/lib/floDownDeclareSymbolUri.ts
  - src/components/FtmlPreview.tsx
  - src/server/ftml/declaredSymbols.ts
  - scripts/backfill-declared-symbols-info.mjs
---

# Decisions: FloDown persist vs FloDown runtime

Locked choices after the FloDown lab, production preview/export cleanup, and opaque symbol-URI
cutover. Wiring lives in the related SDDs and [`ftml.md`](../external-deps/libraries/ftml.md). Cite
**`D-FTML-*` atoms**.

## Context

GloX stores FloDown block statements as FTML JSON. FloDown WASM only accepts HTTP symbol URIs
(MathHub form or the string returned by `addSymbolDeclaration`). Persisting short names while minting
URIs only at preview broke identity moves. Mixing those two worlds, or inventing document URIs after
`fromPath` panics, caused preview and export failures.

## Decision atoms

**D-FTML-01 (superseded):** The database MUST persist local symbol `uri` values as the opaque strings
FloDown returned. The system MUST NOT keep local identity as short names after cutover. Historic
`FloDownBlockVersion` JSON MAY still contain short names until a later rewrite.

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

**D-FTML-04:** `FloDownBlock.declaredSymbolsInfo` MUST record what this block **declares**
(E-FTML-06). The system MUST NOT treat every definiendum `uri` as a declaration. Persist MUST NOT
fill declaration records from definienda that are not declarations.

**D-FTML-05:** GloX MUST NOT mint, parse, or canonicalize **symbol** URIs in application persist or
preview paths. A one-shot backfill script MAY mint URIs for existing short names. Document URIs for
`FloDown.fromUri` remain D-FTML-02.

**D-FTML-06:** FloDown WASM MUST NOT run on the server.

## Why (rationale)

Rejected: GloX-minted persist URIs (false export identity). Rejected: parsing `a=`/`p=`/`m=` on
stored symbol URIs for rewrite. Rejected: FloDown WASM on the server. Rejected: `fromPath` (WASM
panics on language encodings we tried). Rejected: inverted host `http://{futureRepo}?a={path}` as
the encoding we generate. Rejected: putting sibling definitions on the visible document so hover
works (Title/Inhalt/Lernziele showed those definitions).

## Consequences

- Persist `for_symbols` is emptied on save; FloDown still requires the key at `addElement` — the
  rewrite copies stored HTTP URIs from definienda when the key is empty.
- Declaration catalog is `declaredSymbolsInfo` on the declaring block. Unused `Symbol` /
  `declaredSymbols` columns MAY remain deprecated.
- Identity moves replace listed opaque URI strings only (client supplies FloDown’s new URI).
- Hover for a local symbol works when a live FloDown document has declared it (`addSymbolDeclaration`
  with the catalog `symbolName`) and mounted a definition that already stores the opaque URI.
  Otherwise FloDown requests MathHub `/content/fragment` (404 for GloX-local names).
- Version history JSON is not rewritten; leftover short names there are not upgraded at preview.
