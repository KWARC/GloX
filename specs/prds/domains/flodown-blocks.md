---
id: flodown-blocks
featured: true
upstream:
  - glox
compliance: []
code:
  - specs/engineering/features/flodown-blocks/lifecycle.md
---

# PRD: FloDown blocks

FloDown blocks are the unit of curated glossary content — FTML statements with provenance, declared
symbols, curation status, and version history. This PRD covers creation, editing, deletion, status,
and export identity of FloDown blocks.

## Business rules

### Product outcomes

**R-FDB-01 (Event-Driven):** WHEN a user creates a FloDown block from selected source text, the
system MUST store the original text, an FTML statement, and an initial version history entry.

**R-FDB-02 (Event-Driven):** WHEN a user edits a FloDown block statement, the system MUST increment
the version number and MUST append a version history record.

**R-FDB-03 (Event-Driven):** WHEN a user deletes a FloDown block that declares symbols, the system
MUST remove symrefs to those declared symbols from all other FloDown blocks that reference them.

**R-FDB-04 (State-Driven):** WHILE a FloDown block has status DISCARDED, the system MUST exclude it
from curation export queues unless explicitly requested.

**R-FDB-05 (Event-Driven):** WHEN blocks are moved to a target export identity where existing blocks
have a different FloDown block status, the system MUST reject the move and MUST explain the status
conflict.

**R-FDB-06 (Ubiquitous):** Each FloDown block MUST record its export identity (future repository,
file path, file name, language).

### Binding operator / compliance promises

**R-FDB-07 (Ubiquitous):** The system MUST NOT allow unauthenticated users to create, read, update, or
delete FloDown blocks.

**Rationale:** FloDown blocks are curated domain model content — unauthorized mutation corrupts the
glossary and MathHub export.

**R-FDB-08 (Ubiquitous):** The system MUST verify Document ownership (or Admin role) before mutating
FloDown blocks tied to a Document.

**Rationale:** Missing ownership checks allow cross-user modification if block IDs are guessed —
semantic data corruption incident.

<!-- [BACKFILL-TODO: R-FDB-08 is aspirational — code gap documented in auth SDD BUG-001] -->

## Out of scope

- Symbol registry and propagation — see `symbols-semantics.md`
- sTeX generation pipeline — see `curation-export.md`
- Module-description-scoped blocks — shared rules apply; module-specific seeding in
  `module-descriptions.md`

## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-FDB-01 | `lifecycle.md` S-FDB-01 |
| R-FDB-02 | `lifecycle.md` S-FDB-02 |
| R-FDB-03 | `lifecycle.md` S-FDB-03 |
| R-FDB-04 | `lifecycle.md` S-FDB-04 |
| R-FDB-05 | `lifecycle.md` S-FDB-05 |
| R-FDB-06 | `lifecycle.md` S-FDB-06 |
| R-FDB-07 | `lifecycle.md` S-FDB-07 |
| R-FDB-08 | `lifecycle.md` S-FDB-08 — **Gap (BUG-001)** |

## Related docs

- [`lifecycle.md`](../../engineering/features/flodown-blocks/lifecycle.md)
- [`documents-extraction.md`](./documents-extraction.md)
- [`symbols-semantics.md`](./symbols-semantics.md)
