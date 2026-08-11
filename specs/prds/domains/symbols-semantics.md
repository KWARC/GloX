---
id: symbols-semantics
featured: false
upstream:
  - glox
compliance: []
code: []
---

# PRD: Symbols & semantics

Symbols name concepts in the local catalog. Definienda declare concepts in definitions; symrefs link
to local Symbols or MathHub URIs. This PRD covers symbol creation, search, propagation, and
deduplication.

## Business rules

### Product outcomes

**R-SYM-01 (Event-Driven):** WHEN a Curator or Admin marks a definiendum in a FloDown block, the
system MUST create or associate a Symbol with the block's export identity.

**R-SYM-02 (Ubiquitous):** The system MUST enforce unique Symbols per (symbol name, future repository,
file path, file name, language) tuple.

**R-SYM-03 (Event-Driven):** WHEN a Curator or Admin applies symbol propagation, the system MUST
replace matching symref URIs across all affected FloDown block statements and MUST record version
history for each changed block.

**R-SYM-04 (Event-Driven):** WHEN a Curator confirms a Symbol is not a duplicate, the system MUST set
the Symbol's confirmed flag and MUST record the confirming user.

**R-SYM-05 (Event-Driven):** WHEN a user searches the symbolic catalog, the system MUST return
stemmed matches for the query language (English, German, or French).

### Binding operator / compliance promises

**R-SYM-06 (Ubiquitous):** The system MUST NOT allow Extractor-role users to delete unassociated
Symbols or confirm deduplication.

**Rationale:** Symbol registry changes affect export identity and MathHub canonicalization — only
Curators and Admins may perform destructive symbol operations.

**R-SYM-07 (Ubiquitous):** The system MUST NOT allow unauthenticated users to create or mutate
Symbols or symrefs.

**Rationale:** Unauthorized semantic edits corrupt the shared domain model.

## Out of scope

- FloDown block version lifecycle — see `flodown-blocks.md`
- MathHub backend behavior — see `external-deps/vendors/mathhub.md`
- Mark references (page-level mentions) — lightweight feature; no separate SDD yet

## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-SYM-01 | Gap |
| R-SYM-02 | Gap |
| R-SYM-03 | Gap |
| R-SYM-04 | Gap |
| R-SYM-05 | Gap |
| R-SYM-06 | Gap |
| R-SYM-07 | Gap |

## Related docs

- [`flodown-blocks.md`](./flodown-blocks.md)
- [`curation-export.md`](./curation-export.md)
