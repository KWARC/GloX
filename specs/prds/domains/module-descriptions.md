---
id: module-descriptions
featured: false
upstream:
  - glox
compliance: []
code: []
---

# PRD: Module descriptions

GloX processes FAU course module descriptions from a static catalog (`MODULES_DIR`). Users search
modules, create ModuleDescription records with seeded FTML statements, and extract definition FloDown
blocks in module context.

## Business rules

### Product outcomes

**R-MOD-01 (Event-Driven):** WHEN an Extractor, Curator, or Admin searches module descriptions, the
system MUST search the configured FAU modules catalog.

**R-MOD-02 (Event-Driven):** WHEN a user opens a module for the first time, the system MUST create a
ModuleDescription with seeded title, inhalt, and lernziele statements using German as the default
language.

**R-MOD-03 (Event-Driven):** WHEN a user creates a definition block in a module description, the
system MUST associate the FloDown block with that ModuleDescription and MUST use the module's export
identity defaults.

**R-MOD-04 (Event-Driven):** WHEN a Curator or Admin updates a module's index status, the system MUST
persist the new Index status on the ModuleDescription.

**R-MOD-05 (Ubiquitous):** Module description export identity MUST default to future repository
`courses/FAU/module-descriptions` with German language unless overridden at creation.

### Binding operator / compliance promises

**R-MOD-06 (Ubiquitous):** The system MUST NOT allow unauthenticated users to create or edit module
descriptions.

**Rationale:** Module descriptions are part of the curated domain model workflow.

**R-MOD-07 (Event-Driven):** WHEN a user without Extractor, Curator, or Admin role requests module
description operations, the system MUST reject the request.

**Rationale:** Module workflow is restricted to authenticated GloX participants.

## Out of scope

- Live Campo/StudOn API integration — catalog is file-based today
- FloDown block editing rules — see `flodown-blocks.md`
- Module catalog deployment — see `prisma/modules-tar-update.md`

## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-MOD-01 | Gap |
| R-MOD-02 | Gap |
| R-MOD-03 | Gap |
| R-MOD-04 | Gap |
| R-MOD-05 | Gap |
| R-MOD-06 | Gap |
| R-MOD-07 | Gap |

## Related docs

- [`flodown-blocks.md`](./flodown-blocks.md)
- [`glox-features.md`](../../product/glox-features.md)
