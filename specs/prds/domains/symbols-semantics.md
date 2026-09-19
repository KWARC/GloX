---
id: symbols-semantics
featured: true
upstream:
  - glox
compliance: []
code:
  - specs/engineering/features/symbols-semantics/registry.md
  - specs/engineering/features/symbols-semantics/uri-retarget.md
  - specs/engineering/features/symbols-semantics/search.md
  - specs/engineering/features/symbols-semantics/wikipedia-lookup.md
---

# PRD: Symbols & semantics

A Symbol is a declared concept whose identity is the opaque URI FloDown returned. Declaration
records live on the declaring FloDown block. Definienda in definitions name or verbalize that
symbol (E-FTML-06). Symrefs link to local symbol URIs or MathHub URIs. This PRD covers symbol
creation, search, MathHub duplicate, URI retarget, confirmation that a symbol is not a duplicate,
and Wikipedia-assisted definition authoring for **new** Symbols.

## Business rules

### Product outcomes

**R-SYM-01 (Event-Driven):** WHEN an Extractor, Curator, or Admin **declares** a symbol on a FloDown
block, the system MUST record a declaration on that block that includes the symbol’s display name
and the symbol URI FloDown returned, and MUST store that same URI on the declaring definiendum.

**Rationale:** A definiendum can name an already-declared symbol (E-FTML-06). Only a declaration
owns the local symbol URI.

**R-SYM-02 (Ubiquitous):** The system MUST allow at most one non-discarded FloDown block to declare
a given local symbol URI.

**R-SYM-03 (Event-Driven):** WHEN a Curator or Admin applies a MathHub duplicate (local symbol URI
to a MathHub URI), the system MUST replace that local URI with the MathHub URI on every **current**
FloDown block statement that contains it (definienda and symrefs; including discarded blocks and
the declaring block) and on every ModuleDescription `titleStatement`, `inhaltStatement`, and
`lernzieleStatement` that contains it, and MUST append a version history record for each **changed
FloDown block**. The system MUST NOT rewrite historic `FloDownBlockVersion` statement JSON.

**Rationale:** Version rows stay aligned with current statements (R-FDB-02). Old snapshots keep the
local URI.

**R-SYM-04 (Event-Driven):** WHEN a Curator confirms a Symbol is not a duplicate, the system MUST
set the confirmed flag and MUST record the confirming user on that symbol’s declaration record.

**R-SYM-05 (Event-Driven):** WHEN a user searches the symbolic catalog, the system MUST support
search in English, German, and French.

**R-SYM-08 (Event-Driven):** WHEN a Curator or Admin attempts to delete a local symbol declaration,
IF any non-discarded FloDown block still declares that symbol URI, the system MUST reject the
deletion and MUST leave the declaration in place.

**R-SYM-09 (Event-Driven):** WHEN an Extractor, Curator, or Admin, while creating a new Symbol in the
extract or add-content dialog, requests a Wikipedia search for a free-text query (often the symbol
name), the system MUST return Wikipedia search results from the English, German, or French wiki that
matches the FloDown block language. WHEN that dialog opens with a selected symbol name, the system
MUST run that search once for the selected name. Further searches MUST run only on an explicit
Search or Enter action, not on typing alone.

**R-SYM-10 (Event-Driven):** WHEN Wikipedia search returns one or more results in that dialog, the
system MUST display the first result as the selected article and MUST keep its title and URL
visible. WHEN the user selects a Wikipedia search result, the system MUST display that article and
MUST keep the article title and URL visible.

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

**R-SYM-16 (Event-Driven):** WHEN a user changes a FloDown block’s export identity or the display
name of a declared local symbol, the system MUST replace the previous FloDown symbol URI with the
new FloDown symbol URI in every stored statement and declaration record that used the previous
URI, and MUST NOT change other symbol URIs.

**R-SYM-17 (Ubiquitous):** The system MUST NOT create a local symbol catalog entry that is not a
declaration on a FloDown block. Mark references MUST use an existing local symbol URI or a MathHub
URI.

### Binding operator / compliance promises

**R-SYM-06 (Ubiquitous):** The system MUST NOT allow Extractor-role users to delete unassociated
local symbol declarations, confirm a Symbol is not a duplicate, or apply a MathHub duplicate.

**Rationale:** Symbol registry changes affect export identity and MathHub canonicalization — only
Curators and Admins may perform destructive symbol operations.

**R-SYM-07 (Ubiquitous):** The system MUST NOT allow unauthenticated users to create or mutate
Symbols or symrefs.

**Rationale:** Unauthorized semantic edits corrupt the shared domain model.

**R-SYM-15 (Ubiquitous):** The system MUST NOT allow unauthenticated users to request Wikipedia
search.

**Rationale:** An unauthenticated Wikipedia lookup turns GloX into an open Wikimedia proxy and is
outside the signed-in GloXer workflow (same incident class as unauthorized semantic use under
R-SYM-07).

**R-SYM-18 (Ubiquitous):** The system MUST NOT construct a local symbol URI and MUST NOT interpret
a stored local symbol URI as structured fields (archive, path, module, or name token).

**Rationale:** Invented or parsed URIs silently change MathHub/export identity — semantic corruption
of the glossary.

**R-SYM-19 (Ubiquitous):** The system MUST NOT persist a local symbol declaration unless the symbol
URI was supplied as the value FloDown returned for that declaration.

**Rationale:** Server- or model-invented URIs are the same incident class as R-SYM-18 (false export
identity).

**R-SYM-20 (Event-Driven):** WHEN a MathHub duplicate of a local symbol URI with a MathHub URI
succeeds, the system MUST remove the local declaration record for that URI. WHEN the curator chose
to keep the defining FloDown block, the system MUST keep that block and its definition text. WHEN the
curator chose to delete the defining FloDown block, the system MUST delete that `FloDownBlock` (and
its version history) after retarget. The system MUST keep every other FloDown block and every
ModuleDescription row that held rewritten statements.

**Rationale:** MathHub already declares the concept; a second local `\symdecl*` is false identity.
The curator decides whether the extracted definition block stays in the glossary.

**R-SYM-21 (Event-Driven):** WHEN a Curator or Admin opens MathHub duplicate for that local URI, the
system MUST list every FloDown block and every Title/Inhalt/Lernziele statement that currently
contains the local URI (including the declaring block). WHILE a listed FloDown block has status
DISCARDED, the system MUST indicate Discarded on that list entry. The system MUST NOT apply the
rewrite without that list. The system MUST NOT apply the rewrite until the curator has chosen
whether to keep or delete the defining FloDown block.

**R-SYM-23 (State-Driven):** WHILE the FloDown block that declares the local symbol URI also
declares any other local symbol URI in `declaredSymbolsInfo`, the system MUST NOT delete that block
as part of MathHub duplicate for the first URI.

**R-SYM-22 (Event-Driven):** WHEN a Curator or Admin views Deduplication, the system MUST list
unconfirmed local declarations first and MUST list declarations with the confirmed-not-duplicate
flag under a section titled **Confirmed not a duplicate**.

## Out of scope

- FloDown block version lifecycle — see `flodown-blocks.md`
- MathHub backend behavior — see `external-deps/vendors/mathhub.md`
- Mark references (page-level mentions) — lightweight feature; no separate SDD yet. Distinct from
  FTML `symref`; see [`domain-dictionary.yaml`](../../meta/domain-dictionary.yaml) `mark_reference`.
- Auto-filled Wikipedia extracts as the definition body
- Wikipedia article HTML proxied and sanitized by GloX
- LLM ranking of Wikipedia results
- Rewriting historic FloDown block version JSON when symbol URIs change (current statements only)

## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-SYM-01 | `registry.md` S-SYM-01 |
| R-SYM-02 | `registry.md` S-SYM-02 |
| R-SYM-03 | `uri-retarget.md` S-SYM-03, S-SYM-03a, S-SYM-16 |
| R-SYM-04 | `registry.md` S-SYM-04 |
| R-SYM-05 | `search.md` S-SYM-05 |
| R-SYM-06 | `registry.md` S-SYM-06; `uri-retarget.md` S-SYM-15 |
| R-SYM-07 | `registry.md` S-SYM-07; `uri-retarget.md` S-SYM-15 — **Gap (BUG-003)** remaining list/search handlers |
| R-SYM-08 | `registry.md` S-SYM-08 |
| R-SYM-09 | `wikipedia-lookup.md` S-SYM-09 |
| R-SYM-10 | `wikipedia-lookup.md` S-SYM-10 |
| R-SYM-11 | `wikipedia-lookup.md` S-SYM-11 |
| R-SYM-12 | `wikipedia-lookup.md` S-SYM-12 |
| R-SYM-13 | `wikipedia-lookup.md` S-SYM-13 |
| R-SYM-14 | `wikipedia-lookup.md` S-SYM-14 |
| R-SYM-15 | `wikipedia-lookup.md` S-SYM-15 |
| R-SYM-16 | `registry.md` S-SYM-10; `lifecycle.md` S-FDB-06a |
| R-SYM-17 | `registry.md` S-SYM-11 |
| R-SYM-18 | `registry.md` S-SYM-13; D-FTML-05 |
| R-SYM-19 | `registry.md` S-SYM-09 |
| R-SYM-20 | `uri-retarget.md` S-SYM-03 |
| R-SYM-21 | `uri-retarget.md` S-SYM-14 |
| R-SYM-22 | `Deduplication.tsx`, `dedupCatalogDisplay.ts` |
| R-SYM-23 | `uri-retarget.md` S-SYM-03 |

## Related docs

- [`registry.md`](../../engineering/features/symbols-semantics/registry.md)
- [`uri-retarget.md`](../../engineering/features/symbols-semantics/uri-retarget.md)
- [`search.md`](../../engineering/features/symbols-semantics/search.md)
- [`wikipedia-lookup.md`](../../engineering/features/symbols-semantics/wikipedia-lookup.md)
- [`flodown-blocks.md`](./flodown-blocks.md)
- [`curation-export.md`](./curation-export.md)
- [`wikipedia.md`](../../engineering/external-deps/vendors/wikipedia.md)
