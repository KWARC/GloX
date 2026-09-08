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
TeX file plus definition TeX files. Shared FloDown and symbol rules apply via sibling PRDs. GloXers
may mark a module description as a **duplicate** of another already-created description so catalog
clones share annotated Inhalt and Lernziele.

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

**R-MOD-25 (Event-Driven):** WHEN an authenticated Extractor, Curator, or Admin requests the module
description list, the system MUST present each row’s faculty and subject area from the configured FAU
hierarchy catalog beneath that module’s title when those values are present.

**R-MOD-26 (Event-Driven):** WHEN an authenticated Extractor, Curator, or Admin views the Modules
table on `/module-descriptions`, the system MUST allow revealing who created each listed module
description (display name and email).

**R-MOD-03 (Event-Driven):** WHEN an Extractor, Curator, or Admin creates a module description for a
catalog module, the system MUST seed title, inhalt, and lernziele statements from that module's
catalog entry and MUST reject creation when a description for the same module already exists.

**R-MOD-04 (Event-Driven):** WHEN an Extractor, Curator, or Admin works in a module description, the
system MUST allow adding semantics to the title, inhalt, and lernziele statements — including marking
definienda and inserting symrefs to local Symbols or MathHub concepts. This rule does **not** apply
WHILE the description is marked as a duplicate of another (R-MOD-21).

**R-MOD-05 (Event-Driven):** WHEN an Extractor, Curator, or Admin needs a new local Symbol while
annotating a module description statement or definition, the system MUST create that Symbol together
with a definition FloDown block associated with the ModuleDescription, using the module's export
identity for definitions. This rule does **not** apply WHILE the description is marked as a duplicate
of another (R-MOD-21).

**R-MOD-06 (Event-Driven):** WHEN an Extractor, Curator, or Admin works on an extracted definition in
a module description, the system MUST allow adding semantics to that definition — including marking
definienda and inserting symrefs — and WHEN that annotation requires a new local Symbol, the system
MUST apply R-MOD-05 (which may introduce further definitions that are themselves annotated). This
rule does **not** apply WHILE the description is marked as a duplicate of another (R-MOD-21).

**R-MOD-07 (Ubiquitous):** At module description creation, the system MUST capture export identity
(future repository, modules path, definitions path, language) using FAU module-description archive
defaults unless the user overrides them at creation. WHEN the catalog hierarchy lists a subject area
for the module, the default definitions path MUST include that subject area as a path segment under
`defs`; WHEN no subject area is listed, the default definitions path MUST be `defs`.

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
annotated statements. WHEN the description is marked as a duplicate of another, the module TeX MUST
follow R-MOD-23 instead of using only that description’s own three annotated statements.

**R-MOD-12 (Event-Driven):** WHEN a Curator or Admin exports a module description, the system MUST
also produce a TeX file for each extracted definition associated with that ModuleDescription.

**R-MOD-19 (Event-Driven):** WHEN an Extractor, Curator, or Admin searches the module catalog, the
system MUST, for each result that has known exact or near catalog peers on title, Inhalt, and
Lernziele, inform the user of those peers without hiding the searched module identifier.

**Rationale:** Users look up a specific module identifier; collapsing clones would hide that hit.

**R-MOD-20 (Event-Driven):** WHEN an Extractor, Curator, or Admin marks a module description as a
duplicate of another, the system MUST require that the other description already exists, MUST NOT
allow the other description to itself be a duplicate, and MUST then remove extracted Inhalt,
Lernziele, definitions, and related glossary blocks on **this** description while retaining this
description’s catalog title. WHEN this description already exists, the system MUST warn before that
removal. WHEN this description does not yet exist, the system MUST NOT show that deletion warning.
The mark UI MUST NOT pre-select a catalog peer that has no description or that is itself a
duplicate. WHEN more than one exact or near catalog peer already has a non-duplicate description,
the mark UI MUST list those peers as potential duplicates, grouped by exact vs near.

**Rationale:** Destructive FloDown delete is the same incident class as reset (data loss of curated
statements and definitions). The original of a mark MUST already be a real description; an
unpersisted catalog clone is not a valid default.

**R-MOD-21 (State-Driven):** WHILE a module description is marked as a duplicate of another, the
system MUST NOT allow adding or changing semantics on that description, and MUST NOT allow adding
symbols or definitions on that description.

**Applies as exception to:** R-MOD-04, R-MOD-05, R-MOD-06.

**Rationale:** Duplicate descriptions are publication aliases, not a second semantic workspace.

**R-MOD-22 (Event-Driven):** WHEN an Extractor, Curator, or Admin unmarks a duplicate, the system
MUST restore an independent workspace by re-seeding title, Inhalt, and Lernziele from this module’s
catalog entry.

**R-MOD-23 (Event-Driven):** WHEN a Curator or Admin exports a module description that is marked as
a duplicate of another, the system MUST produce a module TeX file named from **this** module
identifier and language whose Title section is this description’s retained catalog title (plain
text) and whose Inhalt and Lernziele sections are the **canonical** description’s annotated
statements.

**Rationale:** Near-duplicate titles can differ; title semantics stay on the canonical description
only.

**R-MOD-24 (Event-Driven):** WHEN a Curator or Admin exports all module descriptions, the system
MUST include the module TeX file for each duplicate description as well as for each canonical
description.

**R-MOD-26 (Event-Driven):** WHEN an authenticated Extractor, Curator, or Admin marks or unmarks an
in-progress module description as a favorite from the module description list, the system MUST
persist that choice as that user’s personal favorite of that description.

**R-MOD-27 (Event-Driven):** WHEN an authenticated Extractor, Curator, or Admin turns on “Show only
favorites” on the module description list, the system MUST return only module descriptions that user
has favorited, still paginated, and MUST still apply any status or module-ID filters the user has
set. WHEN none of that user’s favorites match the active filters, the system MUST return an empty
list.

**R-MOD-28 (Ubiquitous):** The system MUST NOT present or change another user’s module-description
favorites.

**Rationale:** The in-progress list is shared; a personal working set must not leak across GloXers.

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
- Reordering the Modules list by faculty or subject area
- Catalog search filter or facet by faculty or subject area
- German locale-specific sort of faculty or subject area as a product promise
- Catalog duplicate detection algorithm details and file layout — SDD
- Exam-number identity for catalog duplicates
- Favoriting catalog modules that have no in-progress ModuleDescription
- Shared or Admin-visible favorite lists
- Pinning favorites to the top of the unfiltered Modules list
- Favorite control on the module workspace

## Traceability

| PRD rule | SDD rule(s) |
| --- | --- |
| R-MOD-01 | `workspace.md` S-MOD-01 |
| R-MOD-16 | `workspace.md` S-MOD-16 |
| R-MOD-17 | `workspace.md` S-MOD-17 |
| R-MOD-18 | `workspace.md` S-MOD-18 |
| R-MOD-02 | `workspace.md` S-MOD-02 |
| R-MOD-25 | `workspace.md` S-MOD-25 |
| R-MOD-26 | `workspace.md` S-MOD-26 |
| R-MOD-03 | `workspace.md` S-MOD-03 |
| R-MOD-04 | `workspace.md` S-MOD-04 |
| R-MOD-05 | `workspace.md` S-MOD-05 |
| R-MOD-06 | `workspace.md` S-MOD-06 |
| R-MOD-07 | `workspace.md` S-MOD-07 |
| R-MOD-08 | `workspace.md` S-MOD-08 |
| R-MOD-09 | `workspace.md` S-MOD-09 |
| R-MOD-10 | `workspace.md` S-MOD-10 |
| R-MOD-11 | `export.md` S-MOD-11, S-MOD-23 |
| R-MOD-12 | `export.md` S-MOD-12 |
| R-MOD-13 | `workspace.md` S-MOD-13 |
| R-MOD-14 | `workspace.md` S-MOD-10, S-MOD-14 |
| R-MOD-15 | `export.md` S-MOD-15 |
| R-MOD-19 | `workspace.md` S-MOD-19 |
| R-MOD-20 | `workspace.md` S-MOD-20 |
| R-MOD-21 | `workspace.md` S-MOD-21 |
| R-MOD-22 | `workspace.md` S-MOD-22 |
| R-MOD-23 | `export.md` S-MOD-23 |
| R-MOD-24 | `export.md` S-MOD-24 |
| R-MOD-26 | `workspace.md` S-MOD-27 |
| R-MOD-27 | `workspace.md` S-MOD-26 |
| R-MOD-28 | `workspace.md` S-MOD-28 |

## Related docs

- [`workspace.md`](../../engineering/features/module-descriptions/workspace.md)
- [`export.md`](../../engineering/features/module-descriptions/export.md)
- [`flodown-blocks.md`](./flodown-blocks.md)
- [`symbols-semantics.md`](./symbols-semantics.md)
- [`curation-export.md`](./curation-export.md)
- [`glox-features.md`](../../product/glox-features.md)
