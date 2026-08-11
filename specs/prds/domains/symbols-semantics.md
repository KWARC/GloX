---
id: symbols-semantics
featured: false
upstream:
  - glox
compliance: []
code:
  - specs/engineering/features/symbols-semantics/registry.md
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
replace matching local symbol references across all affected FloDown block statements and MUST record
version history for each changed block.

**R-SYM-04 (Event-Driven):** WHEN a Curator confirms a Symbol is not a duplicate, the system MUST set
the Symbol's confirmed flag and MUST record the confirming user.

**R-SYM-05 (Event-Driven):** WHEN a user searches the symbolic catalog, the system MUST support
search in English, German, and French.

**R-SYM-08 (Event-Driven):** WHEN a Curator or Admin attempts to delete a Symbol, IF any non-discarded
FloDown block declares that symbol at the same export identity, the system MUST reject the deletion.

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
- Mark references (page-level mentions) — lightweight feature; no separate SDD yet. Distinct from
  FTML `symref`; see [`domain-dictionary.yaml`](../../meta/domain-dictionary.yaml) `mark_reference`.

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
| R-SYM-08 | `registry.md` S-SYM-08 |

## Related docs

- [`registry.md`](../../engineering/features/symbols-semantics/registry.md)
- [`flodown-blocks.md`](./flodown-blocks.md)
- [`curation-export.md`](./curation-export.md)
