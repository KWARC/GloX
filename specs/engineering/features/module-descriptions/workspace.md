---
id: module-description-workspace
featured: false
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

Owns catalog search, module description create/list, seeded statement editing with semantics,
definition FloDown blocks (including recursive symbol+definition creation), reset, delete, and index
status role gating.

Out of scope (sibling specs):

- Module and definition TeX export — [`export.md`](./export.md)
- FloDown version lifecycle and cascade delete — `flodown-blocks/lifecycle.md`
- Symbol registry / propagation — `symbols-semantics` PRD
- Document PDF extraction — `documents-extraction`

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/routes/module-descriptions/index.tsx` | Lists in-progress ModuleDescription rows and searches the FAU modules catalog; redirects unless the caller is Extractor, Curator, or Admin. |
| `src/routes/module-description/$moduleId.tsx` | Hosts the module workspace: create, statements, definitions, index status UI, reset/delete, and Curator/Admin export entry. |
| `src/serverFns/moduleDescription.server.ts` | Authenticates and mutates ModuleDescription rows, statement fields, definition creation, reset, delete, and index status. |
| `src/server/modules/moduleCatalog.ts` | Loads the static FAU modules catalog and seeds title, inhalt, and lernziele statements from catalog JSON. |
| `ModuleStatementsSection` / `useModuleStatementSemantics` | Edits the three statement fields and inserts definienda or symrefs on those statements. |
| `ModuleDefinitionsSection` / `useModuleDefinitionSemantics` | Lists and semantically edits definition FloDown blocks; creates further symbols and definitions via shared FloDown serverFns. |
| `prisma/schema.prisma` `ModuleDescription` | Stores seeded statements, export identity, index status, and the relation to definition FloDown blocks. |

## Data contracts

| Field / enum | Values / notes |
| --- | --- |
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
`requireExtractorPlus` and MUST return matches from `searchModules` over the configured catalog.

**Upstream:** R-MOD-01

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
| S-MOD-01 | R-MOD-01 | Gap |
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
