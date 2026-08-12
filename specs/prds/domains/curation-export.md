---
id: curation-export
featured: true
upstream:
  - glox
compliance: []
code:
  - specs/engineering/features/curation-export/queue.md
  - specs/engineering/features/curation-export/latex-versioning.md
  - specs/engineering/features/curation-export/stex-export.md
---

# PRD: Curation & export

Curators review extracted FloDown blocks, advance curation status, compose LaTeX output, and export
sTeX toward MathHub. This PRD covers the curation queue, status transitions, LaTeX versioning, and
sTeX generation.

## Business rules

### Product outcomes

**R-CUR-01 (State-Driven):** WHILE a user holds Curator or Admin role, the system MUST provide access
to the curation review queue filtered by FloDown block status.

**R-CUR-02 (Event-Driven):** WHEN a Curator or Admin advances a FloDown block to FINALIZED_IN_FILE,
the system MUST persist the new FloDown block status.

**R-CUR-03 (Event-Driven):** WHEN a user saves LaTeX for a Document, the system MUST store draft or
final LaTeX with version history keyed by export identity.

**R-CUR-04 (Event-Driven):** WHEN the system generates sTeX from finalized FloDown blocks, the system
MUST resolve local symbol references to MathHub-canonical form for export.

**R-CUR-05 (Event-Driven):** WHEN the system exports sTeX, the system MUST inject provenance metadata
for each contributing FloDown block.

**R-CUR-06 (Ubiquitous):** External MathHub URIs in statements MUST pass through export unchanged.

### Binding operator / compliance promises

**R-CUR-07 (Ubiquitous):** The system MUST NOT allow Extractor-role users to access the curation
queue or change FloDown block status on behalf of the curation workflow.

**Rationale:** Curation is a quality gate before MathHub publication — premature status changes
publish unreviewed definitions.

**R-CUR-08 (Ubiquitous):** The system MUST NOT generate sTeX with unresolved local symbol references
when a defining definition exists in the export scope.

**Rationale:** Broken symrefs in exported sTeX corrupt the MathHub archive and downstream assessment
pipelines.

## Out of scope

- MathHub upload/submit automation — status SUBMITTED_TO_MATHHUB is tracked; actual archive push may
  be manual
- FloDown block editing — see `flodown-blocks.md`
- Symbol propagation — see `symbols-semantics.md`

## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-CUR-01 | `queue.md` S-CUR-01 |
| R-CUR-02 | `queue.md` S-CUR-02 |
| R-CUR-03 | `latex-versioning.md` S-CUR-03 |
| R-CUR-04 | `stex-export.md` S-CUR-04 |
| R-CUR-05 | `stex-export.md` S-CUR-05 |
| R-CUR-06 | `stex-export.md` S-CUR-06 |
| R-CUR-07 | `queue.md` S-CUR-07 — **Gap (BUG-004)** |
| R-CUR-08 | `stex-export.md` S-CUR-08 |

## Related docs

- [`queue.md`](../../engineering/features/curation-export/queue.md)
- [`latex-versioning.md`](../../engineering/features/curation-export/latex-versioning.md)
- [`stex-export.md`](../../engineering/features/curation-export/stex-export.md)
- [`flodown-blocks.md`](./flodown-blocks.md)
- [`symbols-semantics.md`](./symbols-semantics.md)
- [`../../engineering/external-deps/vendors/flodown.md`](../../engineering/external-deps/vendors/flodown.md)
