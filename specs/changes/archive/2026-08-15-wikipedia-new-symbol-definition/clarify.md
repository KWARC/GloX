# Clarify: Wikipedia definition for new symbols

> **Phase:** Clarify — decision record before delta files. Copy from `_TEMPLATE/` at the start of
> Clarify; update iteratively until the human signs off. Do **not** draft `proposal.md`, `design.md`,
> or `tasks.md` until **Human decisions** below are complete and signed.
>
> **Canonical guide:** [CLARIFY_AND_PROPOSE.md](../CLARIFY_AND_PROPOSE.md).

---

## Feature request (input)

For a selected new symbol, automatically find the best matching Wikipedia definition and add it to
the description.

Session decisions:

- Target: the FloDown **definition statement body** in the Create new symbol / extract dialog — not a
new `Symbol.description` column. (2026-08-13)
- Persist: Wikipedia text is not auto-written. The user copies relevant passages into the definition
input. The FloDown block is saved only when they submit the existing extract/create flow.
(2026-08-14)
- Results UI: after search, the user sees a list of Wikipedia hits. Clicking a result shows that
article in an iframe. Switching results changes the iframe. (2026-08-14)



## Restatement

When an Extractor, Curator, or Admin creates a **new** local Symbol in the extract / add-content
dialog, they request a Wikipedia search for the symbol name (in the block’s language wiki). The
system shows a list of search results. Selecting a result displays that Wikipedia article in an
iframe so the user can read it and copy relevant text into the definition input. Selecting a
different result replaces the iframe with that article. Nothing from Wikipedia is stored until the
user pastes into the definition input **and** submits the dialog.

**Human approval:** approved on 2026-08-14 by Keerthan K 

## Upstream audit


| Check                                | Result                           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specs read                           | done                             | `[prds/domains/symbols-semantics.md](../prds/domains/symbols-semantics.md)` — create/associate Symbol; no Wikipedia. `[prds/domains/flodown-blocks.md](../prds/domains/flodown-blocks.md)` — statement + version history. `[engineering/external-deps/vendors/openai.md](../engineering/external-deps/vendors/openai.md)` **E-OPENAI-03** — unreviewed external text must not be written to FloDown `statement` (still applies: user copies). `[engineering/features/symbols-semantics/registry.md](../engineering/features/symbols-semantics/registry.md)`. No Wikipedia vendor spec today. |
| ADR alignment                        | pass                             | No ADR conflict. New vendor facts belong in `external-deps/vendors/` at Propose.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Compliance                           | pass                             | Wikimedia requires an identifying User-Agent. Extracts and article HTML are CC BY-SA; v1 relies on the user copying text, and the UI must keep the article URL visible for attribution. Lookup sends the **symbol name** only (not PDF page text). Live `wikipedia.org` article pages currently do not send `X-Frame-Options` / `frame-ancestors`; framing can still fail (browser, GloX CSP, or Wikimedia policy change).                                                                                                                                                                   |
| Blast radius (`code` in frontmatter) | UI + new serverFn                | `[src/components/ExtractTextDialog.tsx](../../src/components/ExtractTextDialog.tsx)`; new authenticated search server function; dialogs that already pass `createSymbolFlow`. Does **not** change `createSymbolDefiniendum` AST replace, symbol uniqueness, propagation, or export identity.                                                                                                                                                                                                                                                                                                 |
| Blocking questions                   | none                             | Iframe fallback and attribution-on-copy locked with the rest of Open questions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |




## Open questions


| Question                                                                                                                                                        | Status                     | Resolution / owner                                                                                                                                                                                                | Date       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| How to pick the “best” Wikipedia article?                                                                                                                       | resolved | Do not auto-pick. Wikimedia search returns a list; the user chooses which result to open in the iframe.                                                                                                           | 2026-08-14 |
| When the user accepts a match, should GloX put only the Wikipedia extract into the definition body, or the extract plus the article URL (CC BY-SA attribution)? | resolved | GloX does not auto-fill the definition body. The user copies text from the article iframe into the definition input. The selected article’s title and URL stay visible so they can include a source if they want. | 2026-08-14 |
| Fetch on every name change vs explicit control?                                                                                                                 | resolved | Explicit control (not every keystroke) to respect Wikimedia rate limits.                                                                                                                                          | 2026-08-13 |
| If the live Wikipedia iframe is blocked, what should v1 do?                                                                                                     | resolved | Keep the result list. If the iframe fails to load, show the article URL and an “Open on Wikipedia” control so the user can still copy from a new tab.                                                             | 2026-08-14 |




## Options



### Matching


| Option                                                                              | Product impact                            | Engineering cost                    | Risk                                               | Recommendation |
| ----------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------------------- | -------------- |
| **A.** Wikimedia search returns a ranked list; the user opens a result in an iframe | User judges “best” by reading the article | Low–medium (search API + iframe UI) | Homonyms still appear in the list; user can switch | **v1**         |
| **B.** LLM ranks Wikipedia search hits                                              | System picks “best” without reading       | OpenAI + extra latency              | Couples Wikipedia to LLM; cost                     | v2             |
| **C.** Exact Wikipedia title only                                                   | Predictable misses                        | Tiny                                | Misses most math terms                             | No             |




### Article display


| Option                                                                                                                                                                     | Product impact                                                                               | Engineering cost                                                           | Risk                                                                                           | Recommendation                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **D.** Load the selected Wikipedia article in a live iframe of the article URL. When the user selects a different search result, the iframe `src` updates to that article. | The user can read the full article and copy text with the browser’s normal copy behavior.    | Cost is low: set the iframe `src` to the article URL.                      | Wikipedia, the browser, or GloX CSP may block framing later, which would leave a blank iframe. | **v1**                                                    |
| **E.** Fetch the article HTML through the Wikimedia REST API and render it in a sandboxed iframe using `srcdoc`.                                                           | The article still appears in GloX even if Wikipedia forbids live framing of `wikipedia.org`. | Cost is higher: the server must proxy HTML and sanitize it before display. | Unsanitized HTML is a security risk, and the vendor surface is larger than a live iframe.      | Use as a fallback or in v2 if option D fails in practice. |




### Persist and surface

The definition textarea stays user-owned. Wikipedia is a reading aid, not an auto-fill. Do not add a
Prisma `Symbol.description` field.

**Chosen approach:** A + D. Explicit search control. Authenticated lookup only. User copies into the
definition input. If the iframe does not load, “Open on Wikipedia” (fourth open question).

## v1 scope

- Surfaces that already use `createSymbolFlow` / new-symbol extract dialog (documents, module
descriptions, sTeX curation).
- Authenticated Wikipedia search for the new symbol name; no hits → message, no iframe.
- Language wiki from the block `language` (EN/DE/FR). No fallback to another language wiki if that
wiki has no hit.
- Result list: user selects a hit; iframe shows that article; selecting another hit updates the
iframe.
- User copies relevant text from the article into the definition input. Persist only on existing
dialog submit.
- Selected title and URL remain visible. If the iframe fails, “Open on Wikipedia”.
- New vendor fact `E-WIKI-*` at Propose (identifying User-Agent; no unauthenticated proxy of
Wikimedia).



## Non-goals and v2



### Non-goals (not in this change)

- Auto-filling the definition body from a Wikipedia extract without the user copying.
- New Prisma `Symbol.description` (or any Symbol-row description column).
- Overwriting **already saved** FloDown blocks, or “Make new symbol” on a definition that already has
body text outside this dialog.
- Changing symbol uniqueness, propagation, deduplication, or export.
- Unauthenticated Wikipedia lookup.
- Fetching and sanitizing full article HTML as a proxy (option E) unless live iframe fails and we
reopen Clarify.



### v2 (separate FR later)

- LLM ranking of Wikipedia search hits.
- Wikidata / MathHub article matching.
- Caching of search results.
- Fallback to another language wiki when the block-language wiki has no hit.
- Sandboxed REST HTML iframe (option E) if live Wikipedia framing is blocked in production.

**Creep:** Ranking quality, extra languages, other knowledge bases, and HTML proxying stay v2 unless
the live iframe is unusable.

## PRD change decision

- [x] **PRD delta required** — new or changed binding outcomes for v1
- [ ] **No PRD change** — governed by: 

Recommend a new product outcome on `[symbols-semantics.md](../prds/domains/symbols-semantics.md)`
(Wikipedia search and article view while creating a new symbol’s definition body). Thin binding:
unauthenticated users MUST NOT use the lookup (align with **R-SYM-07**). SDD + Wikipedia vendor file
at Propose. **No** OpenAI vendor change unless v2 ranking.

**Human confirmation:** Keerthan K, 2026-08-14 

## Accepted tradeoffs


| Original ask                                                    | What v1 ships instead                                                                                 | Why acceptable                                                                                                       | Agreed by                                        | Date       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------- |
| Automatically find the best match and add it to the description | Search returns a list; the user opens articles in an iframe and copies text into the definition input | Homonyms need human judgment; unreviewed Wikipedia text must not be auto-written into FloDown (E-OPENAI-03 analogue) | Session 2026-08-14 (result list + iframe + copy) | 2026-08-14 |


---



## Human decisions (required before Propose)

Complete every applicable item. **Propose must not start** until all are checked and signed.

- [x] **Restatement** — outcome matches what PM / requester actually asked for (or documented adjustment).
- [x] **Upstream audit** — compliance pass, or HALT escalated with owner; ADR conflicts resolved or superseding ADR planned.
- [x] **Open questions** — no unresolved blocking questions; deferrals have owner and date.
- [x] **Approach** — option chosen (with PM when product impact or compromise is on the table), or N/A with recommendation accepted.
- [x] **v1 scope** — shippable slice approved.
- [x] **Non-goals / v2** — deferred work explicit; nothing smuggled into v1.
- [x] **PRD change** — PRD delta vs **No PRD change** confirmed.
- [x] **Tradeoffs** — engineer + PM sign-off when the product promise changed (P2).

**Lock it — sign-off**

```
Clarify approved: Keerthan K — 2026-08-14
Propose may begin.
```

