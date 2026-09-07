---
id: module-description-workspace
featured: true
upstream:
  - module-descriptions
compliance: []
code:
  - src/serverFns/moduleDescription.server.ts
  - src/server/modules/moduleCatalog.ts
  - src/server/modules/moduleDuplicateIndex.ts
  - src/server/modules/moduleDuplicateHints.ts
  - src/server/modules/moduleDuplicateGuards.ts
  - src/lib/moduleDuplicateHintDisplay.ts
  - src/routes/module-descriptions/index.tsx
  - src/routes/module-description/$moduleId.tsx
  - src/components/module-descriptions/ModuleStatementsSection.tsx
  - src/components/module-descriptions/ModuleDefinitionsSection.tsx
  - src/components/module-descriptions/ModuleDuplicateHint.tsx
  - src/hooks/module-descriptions/useModuleStatementSemantics.ts
  - src/hooks/module-descriptions/useModuleDefinitionSemantics.ts
  - scripts/find-module-description-duplicates.mjs
  - scripts/moduleDescriptionDuplicates.mjs
---

# SDD: Module description workspace

## Domain context

Owns catalog search (including hierarchy faculty / subject area on search hits), catalog duplicate
hints, module description create/list, mark/unmark duplicate, seeded statement editing with
semantics, definition FloDown blocks (including recursive symbol+definition creation), reset, delete,
and index status role gating.

Out of scope (sibling specs):

- Module and definition TeX export — [`export.md`](./export.md)
- FloDown version lifecycle and cascade delete — `flodown-blocks/lifecycle.md`
- Symbol registry / propagation — `symbols-semantics` PRD
- Document PDF extraction — `documents-extraction`
- Reordering the Modules list by faculty or subject area; catalog search filter/facet by faculty or subject area; German locale-aware sort

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/routes/module-descriptions/index.tsx` | Lists in-progress ModuleDescription rows and searches the FAU modules catalog; catalog search table and Modules table show muted hierarchy faculty / subject area under the title when present; catalog search annotates duplicate peers and extracted/duplicate icons; redirects unless the caller is Extractor, Curator, or Admin. |
| `src/routes/module-description/$moduleId.tsx` | Hosts the module workspace: create, statements, definitions, mark/unmark duplicate, index status UI, reset/delete, and Curator/Admin export entry. Organization panel still uses per-module JSON `organizations`, not hierarchy search fields. WHILE marked duplicate, statement and definition panels are hidden. |
| `src/serverFns/moduleDescription.server.ts` | Authenticates and mutates ModuleDescription rows, statement fields, definition creation, mark/unmark duplicate, reset, delete, and index status. `searchModuleDescriptions` uses `requireExtractorPlus` and returns `searchModules` results including org fields and duplicate hints. `listModuleDescriptions` includes hierarchy org fields per row via `getModuleSearchEntry`. |
| `src/server/modules/moduleCatalog.ts` | Loads the static FAU modules catalog from `hierarchy.json` / index; copies hierarchy `faculty` and `subjectArea` into search results; orders `searchModules` matches per S-MOD-17; `getModuleSearchEntry` uses hierarchy org fields (not per-module JSON) with optional JSON title override; seeds title, inhalt, and lernziele from per-module catalog JSON. |
| `src/server/modules/moduleDuplicateIndex.ts` | Loads `MODULES_DIR/duplicates.json` once per process; missing file yields no hints. |
| `src/server/modules/moduleDuplicateHints.ts` | C2 suggestion among exact then near peers using existing `ModuleDescription` rows. |
| `src/server/modules/moduleDuplicateGuards.ts` | Extractor+ mark/unmark policy: T1 canonical exists, no alias-of-alias, FloDown delete on mark. |
| `src/lib/moduleDuplicateHintDisplay.ts` | Eligible mark targets and peer-line helpers for search and workspace. |
| `src/components/module-descriptions/ModuleDuplicateHint.tsx` | Catalog peer counts/ids, extracted vs duplicate icons, potential duplicates list. |
| `ModuleStatementsSection` / `useModuleStatementSemantics` | Edits the three statement fields and inserts definienda or symrefs on those statements. |
| `ModuleDefinitionsSection` / `useModuleDefinitionSemantics` | Lists and semantically edits definition FloDown blocks; creates further symbols and definitions via shared FloDown serverFns. |
| `prisma/schema.prisma` `ModuleDescription` | Stores seeded statements, export identity, index status, optional `duplicateOfModuleId`, and the relation to definition FloDown blocks. |

## Data contracts

| Field / enum | Values / notes |
| --- | --- |
| Hierarchy module `faculty` / `subjectArea` | Optional strings on each `hierarchy.json` module entry. Search index maps missing or blank values to `null`. Unclassified paths may omit both. |
| `ModuleSearchResult` | `{ moduleId, title, faculty: string \| null, subjectArea: string \| null }` — hierarchy org source for catalog search and the Modules list on `/module-descriptions`. Search hits also attach duplicate hints and `duplicateOfModuleId` / extracted flags when a description exists. |
| Catalog duplicate index | `MODULES_DIR/duplicates.json` (default `modules/duplicates.json`). Envelope `version` `1`, `generatedAt`, `fields`, `nearThreshold`, `modules`. Keys are `moduleId`; omit ids with no peers. Each value has `exact` and `near` (empty arrays MAY be omitted). A peer MUST NOT appear in both lists (exact wins). Exact peer `{ moduleId, title }`; near peer plus `score` and `nearKind` (`normalized` \| `similar` \| `mixed`). No self-entries; A↔B symmetry; arrays sorted by numeric `moduleId`. MUST NOT store extracted or marked-duplicate state. Missing file: search still works with no duplicate hints. |
| `ModuleDescription.duplicateOfModuleId` | Nullable FK to another row’s `moduleId`. Canonical rows are null. Duplicate rows MUST NOT be mark targets. WHILE set: `titleStatement` is catalog title only; Inhalt/Lernziele MUST NOT hold curated semantics; no definition `FloDownBlock` rows. |
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
(including organization fields and sort from S-MOD-16 / S-MOD-17, and duplicate hints from S-MOD-19).

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

**S-MOD-18 (Ubiquitous):** Catalog search and the Modules list MUST NOT invent faculty or subject area
labels (including “Unclassified”) when hierarchy values are absent, and MUST NOT substitute
per-module JSON `organizations` for missing hierarchy fields on those lists.

**Upstream:** R-MOD-18

**S-MOD-02 (Event-Driven):** WHEN `listModuleDescriptions` runs, the handler MUST call
`requireExtractorPlus` and MUST return paginated ModuleDescription rows with optional `indexStatus`
and `moduleId` filters.

**Upstream:** R-MOD-02

**S-MOD-25 (Event-Driven):** WHEN `listModuleDescriptions` returns rows, each item MUST include
`faculty` and `subjectArea` from hierarchy via `getModuleSearchEntry` (null when absent), and WHEN
the Modules table on `/module-descriptions` renders a row that has either value, the UI MUST show
those values in muted text beneath the module title (omit the missing part when only one is present;
omit the subtitle when both are null).

**Upstream:** R-MOD-25, R-MOD-18

**S-MOD-03 (Event-Driven):** WHEN `createModuleDescription` succeeds, the system MUST seed
`titleStatement`, `inhaltStatement`, and `lernzieleStatement` from `seedStatementsFromCatalog` and
MUST reject the request if a row already exists for that `moduleId`.

**Upstream:** R-MOD-03

**S-MOD-19 (Event-Driven):** WHEN `searchModuleDescriptions` returns catalog hits, the handler MUST
read the catalog duplicate index and MUST attach, for each hit, that hit’s `exact` and `near` peer
lists plus a **C2** suggestion: among `exact` peers prefer a `moduleId` that already has a
`ModuleDescription` (lowest numeric id if several), else the same rule on `near` peers, else the
lowest numeric peer id among `exact` then `near`. The search UI MUST keep the hit’s `moduleId`
visible and MUST show exact vs near peer counts and listed peer identifiers (extracted vs duplicate
icons; extracted identifiers clickable). U1 copy MUST sit alongside the existing faculty/subject-area
subtitle (**S-MOD-16**); it MUST NOT replace or hide that subtitle. The running app MUST NOT scan all
catalog module JSON files to compute peers. Offline generation MUST emit the index file shape.

**Upstream:** R-MOD-19

**S-MOD-07 (Ubiquitous):** `createModuleDescription` MUST persist `futureRepo`, `modulesFilePath`,
`defsFilePath`, and `language`, falling back to the FAU module-description defaults when the client
omits or blanks a field.

**Upstream:** R-MOD-07

### Statement & definition semantics

**S-MOD-04 (Event-Driven):** WHEN a statement field is updated via `updateModuleDescriptionStatement`,
`updateModuleDescriptionAst`, or `moduleDescriptionSymbolicRef`, the handler MUST call
`requireExtractorPlus` and MUST persist FTML that may include definienda and symrefs on title,
inhalt, or lernziele. This rule does **not** apply WHILE `duplicateOfModuleId` is set (S-MOD-21).

**Upstream:** R-MOD-04

**S-MOD-05 (Event-Driven):** WHEN `createModuleDefinitionBlock` succeeds, the system MUST create a
`FloDownBlock` linked to the ModuleDescription with `documentId` null, MUST create or link a Symbol
keyed by the module definition export identity (`futureRepo`, `defsFilePath`, paragraph `fileName`,
`language`), and MUST write an initial `FloDownBlockVersion`. This rule does **not** apply WHILE
`duplicateOfModuleId` is set (S-MOD-21).

**Upstream:** R-MOD-05

**S-MOD-06 (Event-Driven):** WHEN a user edits an extracted module definition (AST, definiendum, or
symref), the system MUST persist semantics on that FloDown block statement, and WHEN the edit creates
a new local Symbol, the system MUST create an associated definition FloDown block under the same
ModuleDescription (R-MOD-05 / S-MOD-05). This rule does **not** apply WHILE `duplicateOfModuleId` is
set (S-MOD-21).

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

**S-MOD-20 (Event-Driven):** WHEN `markModuleDescriptionDuplicate` runs, the handler MUST call
`requireExtractorPlus`. The target `canonicalModuleId` MUST already have a `ModuleDescription` row
(T1), MUST have `duplicateOfModuleId` null, and MUST not be this same row. WHEN this description
does not yet exist, the handler MUST create it first then mark. WHEN this description already exists,
the handler MUST persist `duplicateOfModuleId`, retain `titleStatement` from catalog, MUST delete
this module’s definition FloDown blocks with the same orphan-symbol cleanup as `resetModuleSemantics`,
and MUST drop curated Inhalt and Lernziele. The workspace MUST warn before that delete only when the
row already exists; the warning MUST state that extracted Inhalt, Lernziele, definitions, and related
glossary blocks on this module will be permanently removed. The workspace MUST pre-fill the canonical
field only from an exact (else near) catalog peer that already has a non-duplicate
`ModuleDescription`. WHEN any such peers exist, the workspace MUST list them as `Potential duplicates`,
grouped by exact vs near.

**Upstream:** R-MOD-20

**S-MOD-21 (State-Driven):** WHILE `duplicateOfModuleId` is set, `updateModuleDescriptionStatement`,
`updateModuleDescriptionAst`, `moduleDescriptionSymbolicRef`, `createModuleDefinitionBlock`,
`resetModuleSemantics`, `extractFloDownBlock`, `createFloDownBlockWithDeclaredSymbol`, and
`updateFloDownBlock` for this description’s statements or definitions MUST fail. The workspace MUST
hide statement and definition panels (not disabled editors). Title and “Marked duplicate of …” remain.

**Applies as exception to:** S-MOD-04, S-MOD-05, S-MOD-06.

**Upstream:** R-MOD-21

**S-MOD-22 (Event-Driven):** WHEN `unmarkModuleDescriptionDuplicate` runs, the handler MUST call
`requireExtractorPlus`, MUST clear `duplicateOfModuleId`, and MUST re-seed title, Inhalt, and
Lernziele from this module’s catalog JSON (same seed path as create / `resetModuleSemantics`).

**Upstream:** R-MOD-22

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

## Operations

- Catalog duplicate index: after catalog refresh, operators regenerate `MODULES_DIR/duplicates.json`
  with `pnpm detect:module-duplicates -- --write-index`. The running app **reads** that file; it does
  not regenerate it on search. Missing file: search still works with no duplicate hints.
- Tests that load `searchModules` or the duplicate index MUST isolate `MODULES_DIR` to a fixture tree
  (never the real `modules/` catalog). A fixture `duplicates.json` lives beside test `hierarchy.json`
  / empty `modules-index.json`.

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-MOD-01 | R-MOD-01 | Gap (auth); contract covered via `searchModules` tests |
| S-MOD-16 | R-MOD-16, R-MOD-18 | `moduleCatalog.test.ts` — hierarchy faculty/subjectArea on results; UI muted subtitle optional |
| S-MOD-17 | R-MOD-17 | `moduleCatalog.test.ts` — faculty → subjectArea → title → moduleId; null org as empty; bare compare |
| S-MOD-18 | R-MOD-18 | `moduleCatalog.test.ts` — null when omitted; no invented “Unclassified”; hierarchy over JSON org |
| S-MOD-02 | R-MOD-02 | Gap |
| S-MOD-25 | R-MOD-25, R-MOD-18 | `moduleCatalog.test.ts` — `getModuleSearchEntry`; Modules table UI optional |
| S-MOD-03 | R-MOD-03 | Gap |
| S-MOD-04 | R-MOD-04 | Gap |
| S-MOD-05 | R-MOD-05 | Gap |
| S-MOD-06 | R-MOD-06 | Gap |
| S-MOD-07 | R-MOD-07 | Gap |
| S-MOD-08 | R-MOD-08 | Gap |
| S-MOD-09 | R-MOD-09 | Gap |
| S-MOD-10 | R-MOD-10, R-MOD-14 | Gap |
| S-MOD-13 | R-MOD-13 | `moduleDuplicates.integration.test.ts` — unauthenticated mark rejected (policy helper; no live JWT) |
| S-MOD-14 | R-MOD-14 | Gap |
| S-MOD-19 | R-MOD-19 | `moduleDuplicateHints.test.ts`; `moduleDuplicates.integration.test.ts` — fixture `62083` exact peer `42438`; hit id stays listed. Index shape: `scripts/moduleDescriptionDuplicates.test.ts` |
| S-MOD-20 | R-MOD-20 | `moduleDuplicates.integration.test.ts` + `moduleDuplicateHints.test.ts` — missing canonical / alias target / eligible originals (guard/helpers; no live Prisma) |
| S-MOD-21 | R-MOD-21 | `moduleDuplicates.integration.test.ts` — statement and create-definition fail WHILE duplicate (guards) |
| S-MOD-22 | R-MOD-22 | `moduleDuplicates.integration.test.ts` — unmark clears FK and re-seeds (policy; no live Prisma) |

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
