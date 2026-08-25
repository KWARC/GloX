---
id: symbols-semantics
featured: true
upstream:
  - glox
compliance: []
code:
  - specs/engineering/features/symbols-semantics/registry.md
  - specs/engineering/features/symbols-semantics/propagation.md
  - specs/engineering/features/symbols-semantics/search.md
  - specs/engineering/features/symbols-semantics/wikipedia-lookup.md
---

# PRD: Symbols & semantics

A Symbol is a declared concept whose identity is the opaque URI FloDown returned. Declaration
records live on the declaring FloDown block. Definienda in definitions name or verbalize that
symbol (E-FTML-06). Symrefs link to local symbol URIs or MathHub URIs. This PRD covers symbol
creation, search, propagation, deduplication, and Wikipedia-assisted definition authoring for
**new** Symbols.

## Business rules

### Product outcomes

**R-SYM-01 (Event-Driven):** WHEN an Extractor, Curator, or Admin **declares** a symbol on a FloDown
block, the system MUST record a declaration on that block that includes the symbol’s display name
and the symbol URI FloDown returned, and MUST store that same URI on the declaring definiendum.

**Rationale:** A definiendum can name an already-declared symbol (E-FTML-06). Only a declaration
owns the local symbol URI.

**R-SYM-02 (Ubiquitous):** The system MUST allow at most one non-discarded FloDown block to declare
a given local symbol URI.

**R-SYM-03 (Event-Driven):** WHEN a Curator or Admin applies symbol propagation, the system MUST
replace matching local symbol references across all affected FloDown block statements and MUST record
version history for each changed block.

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
local symbol declarations or confirm deduplication.

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
| R-SYM-03 | `propagation.md` S-SYM-03, S-SYM-03a |
| R-SYM-04 | `registry.md` S-SYM-04 |
| R-SYM-05 | `search.md` S-SYM-05 |
| R-SYM-06 | `registry.md` S-SYM-06; `propagation.md` S-SYM-06a — **Gap (BUG-003)** |
| R-SYM-07 | `registry.md` S-SYM-07 — **Gap (BUG-003)** |
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

## Related docs

- [`registry.md`](../../engineering/features/symbols-semantics/registry.md)
- [`propagation.md`](../../engineering/features/symbols-semantics/propagation.md)
- [`search.md`](../../engineering/features/symbols-semantics/search.md)
- [`wikipedia-lookup.md`](../../engineering/features/symbols-semantics/wikipedia-lookup.md)
- [`flodown-blocks.md`](./flodown-blocks.md)
- [`curation-export.md`](./curation-export.md)
- [`wikipedia.md`](../../engineering/external-deps/vendors/wikipedia.md)
