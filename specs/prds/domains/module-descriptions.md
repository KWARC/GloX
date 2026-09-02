---
id: module-descriptions
featured: true
upstream:
  - glox
compliance: []
code:
  - specs/engineering/features/module-descriptions/workspace.md
  - specs/engineering/features/module-descriptions/export.md
---

# PRD: Module descriptions

GloX turns FAU course module descriptions into MathHub-ready sTeX. Extractors, Curators, and Admins
search the FAU modules catalog, open a module workspace, annotate the seeded title, inhalt, and
lernziele text with semantics, introduce new symbols with their definitions when needed, annotate
those definitions in turn (which may introduce further symbols and definitions), and export a module
TeX file plus definition TeX files. Shared FloDown and symbol rules apply via sibling PRDs.

## Business rules

### Product outcomes

**R-MOD-01 (Event-Driven):** WHEN an authenticated Extractor, Curator, or Admin searches the module
catalog, the system MUST return matching modules from the configured FAU modules catalog.

**R-MOD-16 (Event-Driven):** WHEN an authenticated Extractor, Curator, or Admin searches the module
catalog, the system MUST present each matching module’s faculty and subject area from the configured
FAU hierarchy catalog beneath that module’s title when those values are present.

**R-MOD-17 (Event-Driven):** WHEN an authenticated Extractor, Curator, or Admin searches the module
catalog, the system MUST order matching modules by faculty first, then by subject area.

**R-MOD-18 (Ubiquitous):** WHEN a matching module has no faculty or subject area in the hierarchy
catalog, the system MUST NOT invent a faculty or subject area label for that search result.

**R-MOD-02 (Event-Driven):** WHEN an authenticated Extractor, Curator, or Admin requests the module
description list, the system MUST return module descriptions already in progress, with pagination and
optional filter by index status.

**R-MOD-03 (Event-Driven):** WHEN an Extractor, Curator, or Admin creates a module description for a
catalog module, the system MUST seed title, inhalt, and lernziele statements from that module's
catalog entry and MUST reject creation when a description for the same module already exists.

**R-MOD-04 (Event-Driven):** WHEN an Extractor, Curator, or Admin works in a module description, the
system MUST allow adding semantics to the title, inhalt, and lernziele statements — including marking
definienda and inserting symrefs to local Symbols or MathHub concepts.

**R-MOD-05 (Event-Driven):** WHEN an Extractor, Curator, or Admin needs a new local Symbol while
annotating a module description statement or definition, the system MUST create that Symbol together
with a definition FloDown block associated with the ModuleDescription, using the module's export
identity for definitions.

**R-MOD-06 (Event-Driven):** WHEN an Extractor, Curator, or Admin works on an extracted definition in
a module description, the system MUST allow adding semantics to that definition — including marking
definienda and inserting symrefs — and WHEN that annotation requires a new local Symbol, the system
MUST apply R-MOD-05 (which may introduce further definitions that are themselves annotated).

**R-MOD-07 (Ubiquitous):** At module description creation, the system MUST capture export identity
(future repository, modules path, definitions path, language) using FAU module-description archive
defaults unless the user overrides them at creation.

**R-MOD-08 (Event-Driven):** WHEN an Extractor, Curator, or Admin deletes a module description, the
system MUST remove the ModuleDescription, its definition FloDown blocks, and Symbols that become
orphaned by that deletion.

**R-MOD-09 (Event-Driven):** WHEN an Extractor, Curator, or Admin resets module semantics, the system
MUST re-seed title, inhalt, and lernziele from the current catalog entry and MUST delete all
definition FloDown blocks for that module description.

**R-MOD-10 (State-Driven):** WHILE a user holds Curator or Admin role, the system MUST allow updating
a module description's index status; WHILE a user holds Extractor role, the system MUST show index
status as read-only.

**R-MOD-11 (Event-Driven):** WHEN a Curator or Admin exports a module description, the system MUST
produce a module TeX file whose name is the module identifier plus language (for example
`12345.de.tex`), structured under Title, Inhalt, and Lernziele und Kompetenzen sections from the
annotated statements.

**R-MOD-12 (Event-Driven):** WHEN a Curator or Admin exports a module description, the system MUST
also produce a TeX file for each extracted definition associated with that ModuleDescription.

### Binding operator / compliance promises

**R-MOD-13 (Ubiquitous):** The system MUST NOT allow unauthenticated users or users without
Extractor, Curator, or Admin role to access module description operations.

**Rationale:** Module descriptions are curated domain model content — unauthorized access or mutation
corrupts the FAU module archive workflow.

**R-MOD-14 (Ubiquitous):** The system MUST NOT allow Extractor-role users to change a module
description's index status.

**Rationale:** Index status is a publication-readiness gate — premature changes by extractors would
mark modules ready before curator review.

**R-MOD-15 (Ubiquitous):** The system MUST NOT allow Extractor-role users to export module description
TeX.

**Rationale:** Export is a publication-facing artifact — premature TeX from unreviewed module
semantics can pollute the MathHub archive path.

## Out of scope

- Live Campo/StudOn API integration — catalog is file-based today; see `prisma/modules-tar-update.md`
- FloDown block version lifecycle, status moves, and cascade symref rules — see `flodown-blocks.md`
- Symbol registry, propagation, and deduplication — see `symbols-semantics.md`
- Document PDF extraction workflow — see `documents-extraction.md`
- Document curation queue and server-side LaTeX versioning — see `curation-export.md`
- Automated MathHub submission or index-status-driven export jobs — status is tracked metadata only
- Post-create edit of module-level export identity — identity is fixed at creation today
- Faculty / subject area subtitle or sort on the in-progress Modules list
- Catalog search filter or facet by faculty or subject area
- German locale-specific sort of faculty or subject area as a product promise

## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-MOD-01 | `workspace.md` S-MOD-01 |
| R-MOD-16 | `workspace.md` S-MOD-16 |
| R-MOD-17 | `workspace.md` S-MOD-17 |
| R-MOD-18 | `workspace.md` S-MOD-18 |
| R-MOD-02 | `workspace.md` S-MOD-02 |
| R-MOD-03 | `workspace.md` S-MOD-03 |
| R-MOD-04 | `workspace.md` S-MOD-04 |
| R-MOD-05 | `workspace.md` S-MOD-05 |
| R-MOD-06 | `workspace.md` S-MOD-06 |
| R-MOD-07 | `workspace.md` S-MOD-07 |
| R-MOD-08 | `workspace.md` S-MOD-08 |
| R-MOD-09 | `workspace.md` S-MOD-09 |
| R-MOD-10 | `workspace.md` S-MOD-10 |
| R-MOD-11 | `export.md` S-MOD-11 |
| R-MOD-12 | `export.md` S-MOD-12 |
| R-MOD-13 | `workspace.md` S-MOD-13 |
| R-MOD-14 | `workspace.md` S-MOD-10, S-MOD-14 |
| R-MOD-15 | `export.md` S-MOD-15 |

## Related docs

- [`workspace.md`](../../engineering/features/module-descriptions/workspace.md)
- [`export.md`](../../engineering/features/module-descriptions/export.md)
- [`flodown-blocks.md`](./flodown-blocks.md)
- [`symbols-semantics.md`](./symbols-semantics.md)
- [`curation-export.md`](./curation-export.md)
- [`glox-features.md`](../../product/glox-features.md)
