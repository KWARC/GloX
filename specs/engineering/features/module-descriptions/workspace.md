---
id: module-description-workspace
featured: true
upstream:
  - module-descriptions
compliance: []
code:
  - src/serverFns/moduleDescription.server.ts
  - src/server/modules/moduleCatalog.ts
  - src/routes/module-descriptions/index.tsx
  - src/routes/module-description/$moduleId.tsx
  - src/components/module-descriptions/ModuleStatementsSection.tsx
  - src/components/module-descriptions/ModuleDefinitionsSection.tsx
  - src/hooks/module-descriptions/useModuleStatementSemantics.ts
  - src/hooks/module-descriptions/useModuleDefinitionSemantics.ts
---

# SDD: Module description workspace

## Domain context

Owns catalog search (including hierarchy faculty / subject area on search hits), module description
create/list, seeded statement editing with semantics, definition FloDown blocks (including recursive
symbol+definition creation), reset, delete, and index status role gating.

Out of scope (sibling specs):

- Module and definition TeX export — [`export.md`](./export.md)
- FloDown version lifecycle and cascade delete — `flodown-blocks/lifecycle.md`
- Symbol registry / propagation — `symbols-semantics` PRD
- Document PDF extraction — `documents-extraction`
- Faculty / subject area subtitle or sort on the in-progress Modules list (same route, different table)
- Catalog search filter/facet by faculty or subject area; German locale-aware sort

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/routes/module-descriptions/index.tsx` | Lists in-progress ModuleDescription rows and searches the FAU modules catalog; catalog search table shows muted faculty / subject area under the title when present; redirects unless the caller is Extractor, Curator, or Admin. In-progress Modules table does not show those fields. |
| `src/routes/module-description/$moduleId.tsx` | Hosts the module workspace: create, statements, definitions, index status UI, reset/delete, and Curator/Admin export entry. Organization panel still uses per-module JSON `organizations`, not hierarchy search fields. |
| `src/serverFns/moduleDescription.server.ts` | Authenticates and mutates ModuleDescription rows, statement fields, definition creation, reset, delete, and index status. `searchModuleDescriptions` uses `requireExtractorPlus` and returns `searchModules` results including org fields. |
| `src/server/modules/moduleCatalog.ts` | Loads the static FAU modules catalog from `hierarchy.json` / index; copies hierarchy `faculty` and `subjectArea` into search results; orders `searchModules` matches per S-MOD-17; seeds title, inhalt, and lernziele from per-module catalog JSON. Search MUST NOT open per-module JSON solely for search-list organization. |
| `ModuleStatementsSection` / `useModuleStatementSemantics` | Edits the three statement fields and inserts definienda or symrefs on those statements. |
| `ModuleDefinitionsSection` / `useModuleDefinitionSemantics` | Lists and semantically edits definition FloDown blocks; creates further symbols and definitions via shared FloDown serverFns. |
| `prisma/schema.prisma` `ModuleDescription` | Stores seeded statements, export identity, index status, and the relation to definition FloDown blocks. |

## Data contracts

| Field / enum | Values / notes |
| --- | --- |
| Hierarchy module `faculty` / `subjectArea` | Optional strings on each `hierarchy.json` module entry. Search index maps missing or blank values to `null`. Unclassified paths may omit both. |
| `ModuleSearchResult` | `{ moduleId, title, faculty: string \| null, subjectArea: string \| null }` — search-list source of truth for organization on `/module-descriptions`. |
| Catalog `organizations` / `programs` | Per-module JSON only (workspace detail). Loader drops null or incomplete rows. Unclassified modules may store `organizations: [null]`; the workspace omits faculty/subject area instead of crashing. Not the catalog-search org source. |
| Statement fields | `titleStatement`, `inhaltStatement`, `lernzieleStatement` (FTML JSON) |
| Export identity | `futureRepo`, `modulesFilePath`, `defsFilePath`, `language` |
| Defaults | `courses/FAU/module-descriptions`, `modules`, `defs`, `de` |
| `IndexStatus` | `EXTRACTED`, `FINALIZED`, `SUBMITTED_TO_MATHHUB` (default `EXTRACTED`) |
| Definition blocks | `FloDownBlock` with `moduleDescriptionId` set and `documentId` null; `filePath` = module `defsFilePath` |

Auth helpers in `moduleDescription.server.ts`:

| Helper | Allowed roles |
| --- | --- |
| `requireExtractorPlus` | Extractor, Curator, Admin |
| `requireCuratorOrAdmin` | Curator, Admin |

## Business rules

### Catalog & list

**S-MOD-01 (Event-Driven):** WHEN `searchModuleDescriptions` runs, the handler MUST call
`requireExtractorPlus` and MUST return matches from `searchModules` over the configured catalog
(including organization fields and sort from S-MOD-16 / S-MOD-17).

**Upstream:** R-MOD-01

**S-MOD-16 (Event-Driven):** WHEN `searchModules` returns matches, each result MUST include `faculty`
and `subjectArea` taken from that module’s `hierarchy.json` entry (null when absent), and WHEN the
catalog search table on `/module-descriptions` renders a hit that has either value, the UI MUST show
those values in muted text beneath the module title (omit the missing part when only one is present;
omit the subtitle when both are null).

**Upstream:** R-MOD-16, R-MOD-18

**S-MOD-17 (Event-Driven):** WHEN `searchModules` returns a non-empty match list, the system MUST
order matches by `faculty` first, then `subjectArea`, then title (case-insensitive), then
`moduleId`. String compares MUST use default runtime comparison (bare `localeCompare` / equivalent)
without a German locale. Absent `faculty` or `subjectArea` MUST compare as the empty string so order
stays defined.

**Upstream:** R-MOD-17

**S-MOD-18 (Ubiquitous):** Catalog search MUST NOT invent faculty or subject area labels (including
“Unclassified”) when hierarchy values are absent, and MUST NOT substitute per-module JSON
`organizations` for missing hierarchy fields on the search list.

**Upstream:** R-MOD-18

**S-MOD-02 (Event-Driven):** WHEN `listModuleDescriptions` runs, the handler MUST call
`requireExtractorPlus` and MUST return paginated ModuleDescription rows with optional `indexStatus`
and `moduleId` filters.

**Upstream:** R-MOD-02

### Create & export identity

**S-MOD-03 (Event-Driven):** WHEN `createModuleDescription` succeeds, the system MUST seed
`titleStatement`, `inhaltStatement`, and `lernzieleStatement` from `seedStatementsFromCatalog` and
MUST reject the request if a row already exists for that `moduleId`.

**Upstream:** R-MOD-03

**S-MOD-07 (Ubiquitous):** `createModuleDescription` MUST persist `futureRepo`, `modulesFilePath`,
`defsFilePath`, and `language`, falling back to the FAU module-description defaults when the client
omits or blanks a field.

**Upstream:** R-MOD-07

### Statement & definition semantics

**S-MOD-04 (Event-Driven):** WHEN a statement field is updated via `updateModuleDescriptionStatement`,
`updateModuleDescriptionAst`, or `moduleDescriptionSymbolicRef`, the handler MUST call
`requireExtractorPlus` and MUST persist FTML that may include definienda and symrefs on title,
inhalt, or lernziele.

**Upstream:** R-MOD-04

**S-MOD-05 (Event-Driven):** WHEN `createModuleDefinitionBlock` succeeds, the system MUST create a
`FloDownBlock` linked to the ModuleDescription with `documentId` null, MUST create or link a Symbol
keyed by the module definition export identity (`futureRepo`, `defsFilePath`, paragraph `fileName`,
`language`), and MUST write an initial `FloDownBlockVersion`.

**Upstream:** R-MOD-05

**S-MOD-06 (Event-Driven):** WHEN a user edits an extracted module definition (AST, definiendum, or
symref), the system MUST persist semantics on that FloDown block statement, and WHEN the edit creates
a new local Symbol, the system MUST create an associated definition FloDown block under the same
ModuleDescription (R-MOD-05 / S-MOD-05).

**Upstream:** R-MOD-06

### Delete & reset

**S-MOD-08 (Event-Driven):** WHEN `deleteModuleDescription` succeeds, the system MUST remove orphaned
Symbols declared only by that module's blocks, then MUST delete the ModuleDescription (cascading its
FloDown blocks).

**Upstream:** R-MOD-08

**S-MOD-09 (Event-Driven):** WHEN `resetModuleSemantics` succeeds, the system MUST delete all FloDown
blocks for the ModuleDescription, MUST re-seed the three statement fields from the current catalog
JSON, and MUST clean up Symbols orphaned by the deleted blocks.

**Upstream:** R-MOD-09

### Index status & access

**S-MOD-10 (State-Driven):** WHILE the caller is Curator or Admin, `updateModuleDescriptionIndexStatus`
MUST persist the new `IndexStatus`; Extractor callers MUST be rejected by `requireCuratorOrAdmin`, and
the detail UI MUST show index status as read-only for Extractors.

**Upstream:** R-MOD-10, R-MOD-14

**S-MOD-13 (Ubiquitous):** Module description route loaders and dedicated module serverFns MUST reject
unauthenticated callers and callers whose role is not Extractor, Curator, or Admin.

**Upstream:** R-MOD-13

**S-MOD-14 (Ubiquitous):** `updateModuleDescriptionIndexStatus` MUST use `requireCuratorOrAdmin` and
MUST NOT succeed for Extractor-role users.

**Upstream:** R-MOD-14

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-MOD-01 | R-MOD-01 | Gap (auth); contract covered via `searchModules` tests |
| S-MOD-16 | R-MOD-16, R-MOD-18 | `moduleCatalog.test.ts` — hierarchy faculty/subjectArea on results; UI muted subtitle optional |
| S-MOD-17 | R-MOD-17 | `moduleCatalog.test.ts` — faculty → subjectArea → title → moduleId; null org as empty; bare compare |
| S-MOD-18 | R-MOD-18 | `moduleCatalog.test.ts` — null when omitted; no invented “Unclassified” |
| S-MOD-02 | R-MOD-02 | Gap |
| S-MOD-03 | R-MOD-03 | Gap |
| S-MOD-04 | R-MOD-04 | Gap |
| S-MOD-05 | R-MOD-05 | Gap |
| S-MOD-06 | R-MOD-06 | Gap |
| S-MOD-07 | R-MOD-07 | Gap |
| S-MOD-08 | R-MOD-08 | Gap |
| S-MOD-09 | R-MOD-09 | Gap |
| S-MOD-10 | R-MOD-10, R-MOD-14 | Gap |
| S-MOD-13 | R-MOD-13 | Gap |
| S-MOD-14 | R-MOD-14 | Gap |

## Open documentation gaps

- Catalog markdown is stripped to plain text on seed (`seedStatementsFromCatalog`) — structured FTML conversion is a code TODO.

## Implementation bugs

| ID | File(s) | Description |
| --- | --- | --- |
| BUG-002 | Shared FloDown serverFns used by module definition edits (`updateFloDownBlock*`, `symbolicRef`, etc.) | Mutations check login only — not `requireExtractorPlus` and not ModuleDescription association. Dedicated module serverFns are correctly gated. |

## Related docs

- [`module-descriptions.md`](../../../prds/domains/module-descriptions.md)
- [`export.md`](./export.md)
- [`../flodown-blocks/lifecycle.md`](../flodown-blocks/lifecycle.md)
- [`../symbols-semantics/registry.md`](../symbols-semantics/registry.md)
