---
id: module-description-export
featured: true
upstream:
  - module-descriptions
compliance: []
code:
  - src/lib/moduleDescriptionTex.ts
  - src/lib/moduleDescriptionTexExport.ts
  - src/lib/prepareFloDownStatement.ts
  - src/lib/flodownUris.ts
  - src/components/module-descriptions/ModuleDescriptionLatexModal.tsx
  - src/routes/module-description/$moduleId.tsx
  - src/routes/module-descriptions/index.tsx
  - src/serverFns/moduleDescription.server.ts
  - src/lib/moduleLocalSymbols.ts
---

# SDD: Module description TeX export

## Domain context

Owns Curator/Admin export of MathHub-oriented sTeX for a ModuleDescription: one module file from the
annotated title/inhalt/lernziele statements (or, for a marked duplicate, alias catalog title plus
canonical Inhalt/Lernziele), plus one TeX file per extracted definition FloDown block on non-duplicate
rows.

Out of scope (sibling specs):

- Workspace create/edit/reset/delete — [`workspace.md`](./workspace.md)
- Document LaTeX versioning and curation queue — `curation-export` PRD
- Automated MathHub archive push — not implemented

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/routes/module-description/$moduleId.tsx` | Shows Preview LaTeX only for Curator or Admin and invokes client-side TeX generation. |
| `src/routes/module-descriptions/index.tsx` | Curator/Admin bulk export. The button label comes from `bulkTexExportButtonLabel`. The click passes the Modules status Select as `indexStatus` and does not pass favorites, module-ID query, or list page. An empty export set is refused before zip download. |
| `listModuleDescriptionsForTexExport` | `requireCuratorOrAdmin`. Optional `indexStatus` only. The export set is `selectModuleDescriptionsForBulkTexExport`. Canonical Inhalt and Lernziele are loaded by module id even when that canonical row’s status is outside the filter. |
| `src/lib/moduleDescriptionTex.ts` | Builds the combined module FTML document and serializes module and definition sTeX via FloDown WASM in the browser. Definition files call `addSymbolDeclaration` with that block's declared names before `getStex()`. Mounts **only** the file being exported (D-FTML-03 for preview; export does not copy sibling definition bodies). |
| `src/lib/prepareFloDownStatement.ts` | Shared rewrite before `addElement` (stored URIs pass through). |
| `src/lib/moduleLocalSymbols.ts` | Collects declared opaque URIs for hover/export identity of sibling definition blocks. |
| `ModuleDescriptionLatexModal` | Displays generated module and definition TeX for copy or download. |
| FloDown WASM (`initFloDown`) | Serializes mounted FTML blocks to sTeX; must run in the browser. |

## Data contracts

| Artifact | Naming / shape |
| --- | --- |
| Module TeX file | `{moduleId}.{language}.tex` |
| Definition TeX file | `{fileName}.{language}.tex` per definition FloDown block |
| Module FTML structure | Section headings Title, Inhalt, Lernziele und Kompetenzen wrapping the three statement contents (`buildModuleDescriptionStatement`) |
| Module FloDown document URI | `http://mathhub.info?a={futureRepo}&p={modulesFilePath}&d={moduleId}&l={language}` |
| Definition FloDown document URI | `http://mathhub.info?a={futureRepo}&p={filePath}&d={fileName}&l={language}` |

## Business rules

**S-MOD-11 (Event-Driven):** WHEN Curator or Admin export runs for a row that is not a duplicate,
`generateModuleDescriptionModuleTex` MUST produce sTeX for a file named `{moduleId}.{language}.tex`
whose content is built from the three annotated statements under Title, Inhalt, and Lernziele und
Kompetenzen section headings.

**Upstream:** R-MOD-11

**S-MOD-12 (Event-Driven):** WHEN Curator or Admin export runs, `generateModuleDescriptionTexPreview`
MUST produce one TeX artifact per definition FloDown block associated with the ModuleDescription,
named `{fileName}.{language}.tex`. Duplicate rows MUST NOT contribute definition TeX files.

**Upstream:** R-MOD-12

**S-MOD-23 (Event-Driven):** WHEN Curator or Admin export runs for a row with `duplicateOfModuleId`
set, `composeModuleTexInputForExport` / `generateModuleDescriptionModuleTex` MUST name the file
`{this.moduleId}.{this.language}.tex`, MUST build the Title section from this row’s retained catalog
title as plain text, and MUST build Inhalt and Lernziele from the **canonical** row’s
`inhaltStatement` and `lernzieleStatement`.

**Upstream:** R-MOD-23

**S-MOD-24 (Event-Driven):** WHEN Curator or Admin bulk export runs, `listModuleDescriptionsForTexExport`
MUST call `requireCuratorOrAdmin` and MUST reject Extractor and unauthenticated callers.

The handler accepts an optional `indexStatus` of `EXTRACTED`, `FINALIZED`, or `SUBMITTED_TO_MATHHUB`.
It MUST build the export set with `selectModuleDescriptionsForBulkTexExport`: WHEN `indexStatus` is
omitted or null, the export set MUST be every `ModuleDescription`; WHEN `indexStatus` is set, the
export set MUST be every `ModuleDescription` whose `indexStatus` equals that value. The selector
MUST NOT take page, favorites, or module-ID query, and the handler MUST NOT accept `page`,
`pageSize`, `favoritesOnly`, or `query`. The handler MUST NOT drop a matching row because of the
Modules list page, **Show only favorites**, or the module-ID search.

WHEN the export set includes a row with `duplicateOfModuleId` set, the handler MUST load that
canonical row by module id even when the canonical row’s `indexStatus` is outside the filter, and
MUST pass the canonical `inhaltStatement` and `lernzieleStatement` to
`composeModuleTexInputForExport`. The canonical row’s own module file MUST be included only when
the canonical row is itself in the export set. Definition TeX files MUST be produced only for
export-set rows that are not duplicates (`plannedTexZipFileNames`).

WHEN the export set is empty, the Modules page MUST reject the download with the message
`No module descriptions to export` and MUST NOT call `downloadTexFilesAsZip`.

**Upstream:** R-MOD-24, R-MOD-15, R-MOD-23, R-MOD-12

**S-MOD-32 (State-Driven):** WHILE the caller’s role is `CURATOR` or `ADMIN` on
`/module-descriptions`, the bulk-export control MUST be visible and MUST use
`bulkTexExportButtonLabel` for its label: null → `Download all`; `EXTRACTED` → `Download extracted`;
`FINALIZED` → `Download finalized`; `SUBMITTED_TO_MATHHUB` → `Download submitted`. The label MUST
NOT include a row count. The click MUST pass the current Modules status Select value as
`indexStatus` and MUST NOT pass favorites-only, module-ID query, or list page. WHILE the role is
`EXTRACTOR` or the caller is logged out, the control MUST NOT be shown.

**Upstream:** R-MOD-32, R-MOD-15

**S-MOD-15 (Ubiquitous):** The module detail UI MUST NOT offer TeX export controls to Extractor-role
users; only Curator and Admin may invoke export.

**Upstream:** R-MOD-15

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-MOD-11 | R-MOD-11 | Gap (WASM serialize); compose path covered for non-duplicate via S-MOD-23 unit |
| S-MOD-12 | R-MOD-12 | Gap (WASM serialize) |
| S-MOD-23 | R-MOD-23 | `moduleDescriptionTex.duplicate.test.ts` — alias Title from catalog; Inhalt from canonical |
| S-MOD-24 | R-MOD-24 | `moduleDescriptionBulkExport.test.ts` — null vs one status, favorites not dropped, duplicate composed from an out-of-filter canonical; empty set throws. `moduleDescriptionTex.duplicate.test.ts` — zip names include alias and canonical module files; duplicate-only selection omits definition files |
| S-MOD-32 | R-MOD-32 | `moduleDescriptionBulkExport.test.ts` — four labels, no count. Extractor button visibility: Gap (no page test) |
| S-MOD-15 | R-MOD-15 | Gap (detail UI). Bulk handler Extractor rejection: Gap (no auth harness); handler still calls `requireCuratorOrAdmin` |

## Open documentation gaps

- Export is client-only (browser WASM); there is no server-side TeX persistence for modules comparable
  to Document `LatexTable`.
- Exact sTeX macros and URI rewrite details for local symbols at export time are owned by
  [`stex-export.md`](../curation-export/stex-export.md) and [`ftml.md`](../../external-deps/libraries/ftml.md)
  (D-FTML-05).
- Preview of Title/Inhalt/Lernziele uses a hidden FloDown document for local **symref** hover
  (D-FTML-03). That is not part of the TeX files.

## Related docs

- [`../../decisions/flodown-persist-and-boundary.md`](../../decisions/flodown-persist-and-boundary.md)
- [`module-descriptions.md`](../../../prds/domains/module-descriptions.md)
- [`workspace.md`](./workspace.md)
- [`../../external-deps/libraries/ftml.md`](../../external-deps/libraries/ftml.md)
- [`../../external-deps/vendors/flodown.md`](../../external-deps/vendors/flodown.md)
- [`../../../prds/domains/curation-export.md`](../../../prds/domains/curation-export.md)
