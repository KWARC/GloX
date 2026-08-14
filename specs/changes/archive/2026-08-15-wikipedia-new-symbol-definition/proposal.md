# Proposal: Wikipedia definition for new symbols

> **Layer:** *what* — intent, scope, and optional **PRD delta**. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical PRDs until Archive.
>
> **Policy:** `proposal.md` records *what* (including an optional PRD delta). `design.md` records *how*
> (the SDD delta). `tasks.md` records *do* — atomic Apply steps only, with no new requirements.
>
> **Prerequisites:** Signed [`clarify.md`](./clarify.md) (**Lock it**). Complete
> [Clarify](./CLARIFY_AND_PROPOSE.md#phase-a--clarify) before drafting this file.

---

## Intent and scope

GloXers creating a **new** local Symbol often lack a definition body in the extract / add-content
dialog. v1 lets an authenticated Extractor, Curator, or Admin **request** a Wikipedia search for that
symbol name in the block’s language (English, German, or French), pick among ranked results, read the
selected article in the dialog, switch articles by selecting another result, and **copy** relevant
text into the definition input. Wikipedia text is not auto-written. The FloDown block is saved only
when the user submits the existing extract/create flow.

This is the locked restatement from [`clarify.md`](./clarify.md) (Keerthan K, 2026-08-14).

## Non-goals

- Auto-filling the definition body from Wikipedia without the user copying or typing.
- A new Symbol-row description field.
- Changing already saved FloDown blocks, or “Make new symbol” on a definition that already has body
  text outside this dialog.
- Changing symbol uniqueness, propagation, deduplication, or export.
- Unauthenticated Wikipedia search.
- Fetching and sanitizing full article HTML as a GloX-hosted proxy (Clarify option E), unless live
  article display fails and Clarify is reopened.
- LLM ranking of Wikipedia hits, Wikidata, MathHub article matching, search-result caching, or
  falling back to another language wiki when the block-language wiki has no hit.

## Iteration plan

### v1 (this change)

- Wikipedia search from the create-new-symbol / extract dialog (`createSymbolFlow` surfaces:
  documents, module descriptions, sTeX curation).
- Explicit search control; ranked result list; user selects which article to display; switching
  selection replaces the displayed article.
- User copies into the definition input; persist on existing dialog submit.
- Title and URL of the selected article stay visible. If the article cannot be displayed in the
  dialog, keep the list and offer a control that opens the article on Wikipedia.
- PRD delta on symbols-semantics; SDD + Wikimedia vendor facts in `design.md`.

### v2 (after user feedback — separate FR)

- LLM ranking of Wikipedia search hits.
- Wikidata / MathHub article matching.
- Caching of search results.
- Fallback to another language wiki when the block-language wiki has no hit.
- GloX-hosted article HTML (Clarify option E) if live Wikipedia display is blocked in production.

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | done | From signed `clarify.md`: `prds/domains/symbols-semantics.md`, `prds/domains/flodown-blocks.md`, `engineering/external-deps/vendors/openai.md` (E-OPENAI-03 analogue: no unreviewed write into FloDown), `engineering/features/symbols-semantics/registry.md`. |
| ADR alignment | pass | No ADR conflict. Wikimedia vendor facts belong in `design.md` / `external-deps/vendors/` at Archive. |
| Compliance | pass | Wikimedia User-Agent and CC BY-SA attribution (title and URL visible; user copies). Not a HALT. |
| Blocking questions | none | All Clarify open questions resolved and Lock it signed 2026-08-14. |

## PRD delta

Fold into [`specs/prds/domains/symbols-semantics.md`](../prds/domains/symbols-semantics.md) at Archive.
Do not edit the canonical PRD until then.

Add to the domain blurb that this PRD also covers Wikipedia-assisted definition authoring for **new**
Symbols.

### Product outcomes (add)

**R-SYM-09 (Event-Driven):** WHEN an Extractor, Curator, or Admin, while creating a new Symbol in the
extract or add-content dialog, requests a Wikipedia search for that symbol name, the system MUST
return Wikipedia search results from the English, German, or French wiki that matches the FloDown
block language.

**R-SYM-10 (Event-Driven):** WHEN the user selects a Wikipedia search result in that dialog, the
system MUST display that article and MUST keep the article title and URL visible.

**R-SYM-11 (Event-Driven):** WHEN the user selects a different Wikipedia search result, the system
MUST display the newly selected article in place of the previously displayed article.

**R-SYM-12 (Event-Driven):** WHEN Wikipedia search returns no results, the system MUST inform the
user and MUST NOT display an article.

**R-SYM-13 (Ubiquitous):** The system MUST NOT put Wikipedia article text into the definition input
except when the user copies or types that text.

**Rationale:** Homonyms and glossary quality require human selection; unreviewed Wikipedia text must
not become the definition body.

**R-SYM-14 (Event-Driven):** WHEN the selected Wikipedia article cannot be displayed inside the
dialog, the system MUST keep the search result list and MUST offer a control that opens the article
on Wikipedia.

### Binding operator / compliance promises (add)

**R-SYM-15 (Ubiquitous):** The system MUST NOT allow unauthenticated users to request Wikipedia
search.

**Rationale:** An unauthenticated Wikipedia lookup turns GloX into an open Wikimedia proxy and is
outside the signed-in GloXer workflow (same incident class as unauthorized semantic use under
R-SYM-07).

### Out of scope (add bullets)

- Auto-filled Wikipedia extracts as the definition body
- Wikipedia article HTML proxied and sanitized by GloX
- LLM ranking of Wikipedia results

### Traceability (add rows)

| PRD rule | SDD rule(s) |
| --- | --- |
| R-SYM-09 | `design.md` (Wikipedia lookup SDD; Archive → symbols-semantics SDD + vendor file) |
| R-SYM-10 | same |
| R-SYM-11 | same |
| R-SYM-12 | same |
| R-SYM-13 | same |
| R-SYM-14 | same |
| R-SYM-15 | same |

## Upstream links

| Kind | Link |
| --- | --- |
| Compliance | None in `/specs/prds/compliance/` |
| Commercial | N/A |
| Product context (orientation) | [`specs/product/glox-features.md`](../product/glox-features.md) — Symbols & deduplication; Semantic editing |
| Existing PRDs | [`symbols-semantics.md`](../prds/domains/symbols-semantics.md), [`flodown-blocks.md`](../prds/domains/flodown-blocks.md) |
| Signed Clarify | [`clarify.md`](./clarify.md) |
| Precedent | [`openai.md`](../engineering/external-deps/vendors/openai.md) E-OPENAI-03 (no unreviewed write to FloDown `statement`) |

## Resolved questions

| Question | Resolution | Owner | Date |
| --- | --- | --- | --- |
| How to pick the “best” Wikipedia article? | Do not auto-pick. Wikimedia search returns a list; the user chooses which result to open. | Keerthan K | 2026-08-14 |
| Persist extract only vs extract plus URL (CC BY-SA)? | GloX does not auto-fill the definition body. The user copies from the article. Title and URL stay visible so they can include a source. | Keerthan K | 2026-08-14 |
| Fetch on every name change vs explicit control? | Explicit control (not every keystroke). | Keerthan K | 2026-08-13 |
| If live article display is blocked, what should v1 do? | Keep the result list. If the article cannot be displayed in the dialog, show the URL and a control that opens the article on Wikipedia. | Keerthan K | 2026-08-14 |
| Original FR vs v1 (P2) | FR asked to auto-add the best match. v1 ships a result list, in-dialog article display, and user copy into the definition input. | Session + Keerthan K | 2026-08-14 |

---

Upstream review: Keerthan K — 2026-08-14
Scope: proposal
Teach-back: confirmed
