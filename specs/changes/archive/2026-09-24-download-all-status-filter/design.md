# Design: Filter Download all by module-description index status

> **Layer:** *how* — **SDD / tech-spec delta** for the current stack. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical tech specs until Archive.
>
> **Depends on:** Signed `clarify.md`; `proposal.md` reviewed (Abhishek Chugh — 2026-09-24).
> SDD = policy and boundaries on the current stack — not pseudo-code.
> See [spec-authoring §7](../engineering/spec-authoring.md#7-what-belongs-in-prd-sdd-and-code).

---

## SDD delta

Fold into [`export.md`](../engineering/features/module-descriptions/export.md) at Archive. Do not
edit the canonical SDD until then.

Keep **S-MOD-11**, **S-MOD-12**, **S-MOD-15**, and **S-MOD-23** unchanged. Replace **S-MOD-24**.
Add **S-MOD-32**.

The paginated list handler `listModuleDescriptions` is unchanged. It still applies status,
module-ID query, favorites-only, and page size 20. Those list filters do not define the zip.

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

## Boundaries

| Area | Paths / identifiers |
| --- | --- |
| Code | `src/serverFns/moduleDescription.server.ts` — `listModuleDescriptionsForTexExport` optional `indexStatus`; canonical lookup is not limited to the export set. `src/routes/module-descriptions/index.tsx` — pass `statusFilter`; button label; empty-set refusal before zip download. Pure helpers `selectModuleDescriptionsForBulkTexExport` and `bulkTexExportButtonLabel` (colocated with export helpers, for example `src/lib/moduleDescriptionTexExport.ts`). The handler MUST use the selector for the export set. `listModuleDescriptions`, Preview LaTeX on `$moduleId`, and TeX generation stay as they are. |
| Data | `ModuleDescription.indexStatus` (`EXTRACTED`, `FINALIZED`, `SUBMITTED_TO_MATHHUB`). No schema change. |
| Tenants / tiers | N/A. Role gate remains Curator or Admin. |

## ADR alignment

Pass. No ADR requires an unfiltered bulk export. Client-side FloDown WASM serialization is unchanged
([`flodown-persist-and-boundary.md`](../engineering/decisions/flodown-persist-and-boundary.md)).
No new ADR.

## Operations

| Concern | Link or N/A |
| --- | --- |
| Vendors | N/A — no new MathHub or FloDown call |
| Deployment / flags | N/A — no flag or secret |

## Test mapping

| Rule ID / summary | Test (file or describe block) | Layer (integration / unit / E2E) |
| --- | --- | --- |
| R-MOD-24 / S-MOD-24 — null status exports every row; one status exports only that `indexStatus` | `moduleDescriptionTex.duplicate.test.ts` (or colocated unit) — selector used by the handler: mixed statuses, null returns all, `FINALIZED` returns only Finalized | unit |
| R-MOD-24 / S-MOD-24 — MUST NOT drop rows for page, favorites, or module-ID query | Same unit: selector has no page, favorites, or query input; a Finalized favorite and a Finalized non-favorite both remain when status is `FINALIZED` | unit |
| R-MOD-24 / S-MOD-23 — duplicate in set, canonical status differs | Same unit: Finalized duplicate of an Extracted canonical is in the Finalized set; canonical module id is not; composed input still carries canonical Inhalt/Lernziele | unit |
| R-MOD-24 — empty set MUST NOT download a zip | Unit on the empty-set guard: empty list throws `No module descriptions to export` and does not produce a zip call. Route MUST use that guard before `downloadTexFilesAsZip` | unit |
| R-MOD-12 / S-MOD-24 — definition files only for non-duplicates in the set | Existing `plannedTexZipFileNames` case; add a case where the duplicate is the only selected row and its definition file is absent | unit |
| R-MOD-15 / S-MOD-24 — Extractor MUST NOT export | **Gap** — `requireCuratorOrAdmin` has no Postgres/auth harness in this change. Owner: Abhishek Chugh. Code review confirms the handler still calls it and the new input does not bypass it. | integration Gap |
| R-MOD-32 / S-MOD-32 — four labels, no count | `bulkTexExportButtonLabel` unit: null, `EXTRACTED`, `FINALIZED`, `SUBMITTED_TO_MATHHUB` | unit |
| R-MOD-15 / S-MOD-32 — Extractor MUST NOT see the control | **Gap** — no component test runner for the route. Owner: Abhishek Chugh. The route MUST keep the existing `canExportTex` (`ADMIN` or `CURATOR`) wrapper. | E2E Gap |

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4):

Upstream review: Abhishek Chugh — 2026-09-24
Scope: design
Teach-back: confirmed
-->
