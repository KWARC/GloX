# Tasks: Filter Download all by module-description index status

> **Layer:** *do* — atomic Apply checklist only. **Do not add new requirements here** — trace each
> step to `proposal.md` or `design.md`. Copy from `_TEMPLATE/` into `/specs/changes/`.
>
> **Depends on:** Signed `clarify.md` and upstream-reviewed `design.md` (Abhishek Chugh — 2026-09-24).
> Red-phase test tasks run before implementation tasks.

---

## Red phase (tests must fail first)

- [x] Add unit tests for `selectModuleDescriptionsForBulkTexExport` — [design.md](./design.md) Test mapping, S-MOD-24 / R-MOD-24: null returns every row; `FINALIZED` returns only Finalized rows; a Finalized favorite and a Finalized non-favorite both remain (selector has no page, favorites, or query input); a Finalized duplicate of an Extracted canonical is in the Finalized set and the canonical module id is not; composing that duplicate still carries the canonical Inhalt and Lernziele (R-MOD-23).
- [x] Add a `plannedTexZipFileNames` case where the duplicate is the only selected row and its definition file is absent — [design.md](./design.md) S-MOD-24 / R-MOD-12. This locks existing behavior and may already pass.
- [x] Add a unit test for the empty-set guard: an empty list throws `No module descriptions to export` — [design.md](./design.md) S-MOD-24. Do not assert a zip download from this pure guard.
- [x] Add unit tests for `bulkTexExportButtonLabel`: null → `Download all`; `EXTRACTED` → `Download extracted`; `FINALIZED` → `Download finalized`; `SUBMITTED_TO_MATHHUB` → `Download submitted`; labels do not include a digit — [design.md](./design.md) S-MOD-32 / R-MOD-32.
- [x] Run the new tests and confirm the missing helpers **FAIL** before Implementation. The definition-file case may pass. Do not write the helpers in this phase.
- [x] Leave the two design gaps untested: Extractor rejection on `listModuleDescriptionsForTexExport`, and hiding the button for Extractor — [design.md](./design.md) Test mapping. Owner: Abhishek Chugh.

**Red run (2026-09-24):** `pnpm exec vitest run src/lib/moduleDescriptionBulkExport.test.ts src/lib/moduleDescriptionTex.duplicate.test.ts` — 6 failed / 3 passed.

Failures (missing exports, not syntax): `selectModuleDescriptionsForBulkTexExport`, `assertModuleDescriptionsToExport`, and `bulkTexExportButtonLabel` are not functions. The empty-set assertion reports that “is not a function” error instead of `No module descriptions to export`, which is the same missing export.

Pass (already true): `moduleDescriptionTex.duplicate.test.ts` 3/3, including the new duplicate-only definition-file case.

## Implementation

- [x] Add `selectModuleDescriptionsForBulkTexExport` and use it inside `listModuleDescriptionsForTexExport`. Optional `indexStatus` only. Null or omitted → every row. A status → only that `indexStatus`. Do not add `page`, `pageSize`, `favoritesOnly`, or `query` — [design.md](./design.md) S-MOD-24.
- [x] When a selected row has `duplicateOfModuleId`, load the canonical row by module id even if its status is outside the filter, and pass its Inhalt and Lernziele to `composeModuleTexInputForExport`. Include the canonical module file only when that row is in the export set — [design.md](./design.md) S-MOD-24; [proposal.md](./proposal.md) R-MOD-23 / R-MOD-24.
- [x] Keep `requireCuratorOrAdmin` on `listModuleDescriptionsForTexExport` — [design.md](./design.md) S-MOD-24 / R-MOD-15.
- [x] Add the empty-set guard and call it on `/module-descriptions` before `downloadTexFilesAsZip` when the export set is empty — [design.md](./design.md) S-MOD-24.
- [x] Add `bulkTexExportButtonLabel` and use it for the bulk-export control. Pass `statusFilter` as `indexStatus`. Do not pass favorites, module-ID query, or list page. Keep the control inside the existing Curator/Admin check — [design.md](./design.md) S-MOD-32; [proposal.md](./proposal.md) R-MOD-32.
- [x] Do not change `listModuleDescriptions`, Preview LaTeX, or TeX generation — [design.md](./design.md) Boundaries.

## Verify

- [x] Re-run the Red-phase tests; selector, empty-set guard, and button-label cases are green. Record the definition-file case.
- [x] Confirm every [design.md](./design.md) Test mapping row is green or still the named Extractor / E2E gap.
- [x] `pnpm typecheck` — no new errors in the files this change touches.

**Apply run (2026-09-24):** `pnpm exec vitest run src/lib/moduleDescriptionBulkExport.test.ts src/lib/moduleDescriptionTex.duplicate.test.ts` — 9 passed. `pnpm typecheck` passed. Extractor server rejection and Extractor button visibility remain the named gaps. The Download all label was not clicked in a browser in this session.

---

## Verify (REVIEW_GUIDE §1.5)

```
Verify: 2026-09-24
Human sign-off (cursory): signed off — 2026-09-24
Outcome: pass with waivers (see below); prerequisite gap — no recorded PR or tiered code review
```

### Agent checklist

| Check | Result |
| --- | --- |
| Every `tasks.md` item done or deferred | **pass** — Red, Implementation, and Apply-time Verify are `[x]`. Extractor server rejection and Extractor button visibility stay the design gaps. Owner: human reviewer. |
| Mapped tests green; every `MUST NOT` has negative test or waiver | **pass** — 9/9 on 2026-09-24. Selector keeps both Finalized rows (favorite and not). Empty list throws and a non-empty list does not. Labels have no digit. Duplicate-only zip omits definition files. **Waiver:** Extractor `requireCuratorOrAdmin` rejection and hiding the button have no automated test (design Test mapping). **Waiver:** no test asserts the click omits favorites, module-ID query, and page; the route calls `mutate(statusFilter)` only. |
| `design.md` decisions reflected in shipped code | **pass** — see teach-back |
| `proposal.md` PRD delta matches shipped | **pass** — R-MOD-24 and R-MOD-32 behavior is in the handler, selector, guard, and button. Canonical PRDs are not edited yet (Archive). Non-goals hold: no favorites or module-ID limit on the zip, no multi-status, no current-page export, no Preview LaTeX change. |
| Teach-back without relying only on git diff | **pass** — see below |

### Teach-back (shipped rules)

- **R-MOD-24 / S-MOD-24:** `listModuleDescriptionsForTexExport` still calls `requireCuratorOrAdmin`. Optional `indexStatus` is the only input. `selectModuleDescriptionsForBulkTexExport` returns every row when status is null, and only rows with that status otherwise. Canonical Inhalt and Lernziele are loaded from the full row set, so a duplicate can be exported when its canonical description has a different status. The canonical module file is included only when that canonical row is selected. An empty set throws `No module descriptions to export` before any zip download.
- **R-MOD-32 / S-MOD-32:** The button label is `Download all`, `Download extracted`, `Download finalized`, or `Download submitted`. The click sends the status Select value. The control stays inside the existing Curator/Admin check.
- **R-MOD-12:** A duplicate-only selection contributes the module TeX name and no definition file.
- **R-MOD-15:** Unchanged in spec. The new input does not skip `requireCuratorOrAdmin`. The button is still rendered only when `canExportTex` is true.

### Waivers / gaps (human-owned)

1. **Prerequisite:** Verify normally follows a PR and tiered code review. Neither is recorded.
2. **Extractor rejection and button visibility:** design gaps; no auth harness and no page test.
3. **Browser:** the status label was not clicked in a browser in this session.
4. **Canonical specs:** folded 2026-09-24 into `module-descriptions.md`, `export.md`, and `glox-features.md`.

---

**Archive:** 2026-09-24 — folded into canonical specs; moved to
`specs/changes/archive/2026-09-24-download-all-status-filter/`.

<!-- After human code review: run post-review Verify (REVIEW_GUIDE §1.5), then Archive —
     fold deltas into canonical specs and move this set to
     /specs/changes/archive/YYYY-MM-DD-<feature-slug>/. -->

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4):

Upstream review: Abhishek Chugh — 2026-09-24
Scope: tasks
Teach-back: confirmed
-->
