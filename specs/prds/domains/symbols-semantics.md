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

Symbols name concepts in the local catalog. Definienda declare concepts in definitions; symrefs link
to local Symbols or MathHub URIs. This PRD covers symbol creation, search, propagation,
deduplication, and Wikipedia-assisted definition authoring for **new** Symbols.

## Business rules

### Product outcomes

**R-SYM-01 (Event-Driven):** WHEN an Extractor, Curator, or Admin marks a definiendum in a FloDown
block, the system MUST create or associate a Symbol with the block's export identity.

**R-SYM-02 (Ubiquitous):** The system MUST enforce unique Symbols per (symbol name, future repository,
file path, file name, language) tuple.

**R-SYM-03 (Event-Driven):** WHEN a Curator or Admin applies symbol propagation, the system MUST
replace matching local symbol references across all affected FloDown block statements and MUST record
version history for each changed block.

**R-SYM-04 (Event-Driven):** WHEN a Curator confirms a Symbol is not a duplicate, the system MUST set
the Symbol's confirmed flag and MUST record the confirming user.

**R-SYM-05 (Event-Driven):** WHEN a user searches the symbolic catalog, the system MUST support
search in English, German, and French.

**R-SYM-08 (Event-Driven):** WHEN a Curator or Admin attempts to delete a Symbol, IF any non-discarded
FloDown block declares that symbol at the same export identity, the system MUST reject the deletion.

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

### Binding operator / compliance promises

**R-SYM-06 (Ubiquitous):** The system MUST NOT allow Extractor-role users to delete unassociated
Symbols or confirm deduplication.

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

## Out of scope

- FloDown block version lifecycle — see `flodown-blocks.md`
- MathHub backend behavior — see `external-deps/vendors/mathhub.md`
- Mark references (page-level mentions) — lightweight feature; no separate SDD yet. Distinct from
  FTML `symref`; see [`domain-dictionary.yaml`](../../meta/domain-dictionary.yaml) `mark_reference`.
- Auto-filled Wikipedia extracts as the definition body
- Wikipedia article HTML proxied and sanitized by GloX
- LLM ranking of Wikipedia results

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

## Related docs

- [`registry.md`](../../engineering/features/symbols-semantics/registry.md)
- [`propagation.md`](../../engineering/features/symbols-semantics/propagation.md)
- [`search.md`](../../engineering/features/symbols-semantics/search.md)
- [`wikipedia-lookup.md`](../../engineering/features/symbols-semantics/wikipedia-lookup.md)
- [`flodown-blocks.md`](./flodown-blocks.md)
- [`curation-export.md`](./curation-export.md)
- [`wikipedia.md`](../../engineering/external-deps/vendors/wikipedia.md)
