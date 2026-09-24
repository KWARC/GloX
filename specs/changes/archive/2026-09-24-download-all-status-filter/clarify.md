# Clarify: Filter Download all by module-description index status

> **Phase:** Clarify — **locked**. Propose may begin (`opsx-propose`). Do **not** invent
> policy beyond this file.
>
> **Canonical guide:** [CLARIFY_AND_PROPOSE.md](../CLARIFY_AND_PROPOSE.md).
>
> **Mode:** Full SDD (requester asked for the full path). Critical area: **FTML/sTeX export**
> ([organization.md](../../organization/organization.md) — accountable Abhishek Chugh). Role gate
> stays Curator/Admin; this change does not alter who may export.

---

## Feature request (input)

Requester 2026-09-24 (this conversation):

For the **Download all** feature on `/module-descriptions`, add the ability to filter by status of
the module description (for example EXTRACTED / FINALIZED).

## Restatement

A Curator or Admin on `/module-descriptions` uses the existing Modules **Filter by status** control
to choose what **Download all** puts in the TeX zip: one index status (EXTRACTED, FINALIZED, or
SUBMITTED_TO_MATHHUB), or every in-progress module description when the filter is “All statuses”.
The button label names that set before the click. The zip contains **every matching row** in the
database, not the 20 rows on the current table page. Duplicate and canonical module files, definition
files, and Extractor exclusion stay as today for whatever rows are included.

**Human approval:** approved 2026-09-24 by Abhishek Chugh (Lock it). 

## Upstream audit


| Check                                | Result                                           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specs read                           | done                                             | `[prds/domains/module-descriptions.md](../prds/domains/module-descriptions.md)` **R-MOD-24** — bulk export MUST include the module TeX file for each duplicate and each canonical description (no status predicate). **R-MOD-11 / R-MOD-12 / R-MOD-23** — per-row module and definition TeX, and duplicate composition from the canonical Inhalt/Lernziele. **R-MOD-15** — Extractors MUST NOT export. **R-MOD-02** — the Modules **list** already filters by index status; that rule does not govern the zip. `[export.md](../engineering/features/module-descriptions/export.md)` **S-MOD-24** — `listModuleDescriptionsForTexExport` loads every `ModuleDescription`. `[workspace.md](../engineering/features/module-descriptions/workspace.md)` — `IndexStatus` is `EXTRACTED`, `FINALIZED`, `SUBMITTED_TO_MATHHUB`. Out of scope in the PRD: “Automated MathHub submission or index-status-driven export jobs — status is tracked metadata only.” That excludes scheduled jobs, not a human choosing which statuses to download. |
| ADR alignment                        | pass                                             | No ADR requires unfiltered bulk export. FloDown persist/boundary ADRs are unchanged: export stays client-side WASM.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Compliance                           | pass                                             | No compliance PRD. Export identity and URI rewriting are unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Blast radius (`code` in frontmatter) | bulk export input + Modules Download all control | `[src/routes/module-descriptions/index.tsx](../../src/routes/module-descriptions/index.tsx)` **Download all** calls `listModuleDescriptionsForTexExport()` with no arguments, ignoring the page’s status Select. `[src/serverFns/moduleDescription.server.ts](../../src/serverFns/moduleDescription.server.ts)` `listModuleDescriptionsForTexExport` is `requireCuratorOrAdmin` and `findMany` with no `indexStatus` where. `[src/lib/moduleDescriptionTexExport.ts](../../src/lib/moduleDescriptionTexExport.ts)` generates TeX for whatever rows it is given. Does not change single-module Preview LaTeX, FloDown lifecycle, symbol retarget, or Extractor role gates.                                                                                                                                                                                                                                                                                                                                                             |
| Blocking questions                   | none                                             | Option A is chosen. Zip scope is every matching row, not the current page.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |




## Open questions


| Question                                                                                                                 | Status   | Resolution / owner                                                                                                                                                                                                                                                                                                                                  | Date       |
| ------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Does Download all reuse the Modules “Filter by status” control, or get its own status control?                           | resolved | **A.** Reuse the existing Select. The button label changes with that selection so the curator sees the set before clicking. See Chosen approach and v1 scope.                                                                                                                                                                                                                                                       | 2026-09-24 |
| Should favorites-only or the module-ID search also limit the zip?                                                        | resolved | No. The FR names status only. Those filters stay list-only.                                                                                                                                                                                                                                                                                         | 2026-09-24 |
| Does a matching duplicate still take Inhalt/Lernziele from its canonical row when that canonical has a different status? | resolved | Yes. Status chooses which descriptions are **in the zip**. Composition stays R-MOD-23: a duplicate’s Title is its own catalog title; Inhalt and Lernziele come from the canonical description even when the canonical row is outside the status filter. The canonical’s own module file is included only when the canonical row matches the filter. | 2026-09-24 |
| When status is FINALIZED (or any one status, or All statuses), does the zip contain every matching module description in the database, or only the rows on the current table page? | resolved | **Every match.** The table still pages 20 rows. If 200 descriptions are FINALIZED and the table is on page 3 of 10, **Download finalized** contains all 200. With All statuses, the zip is every module description. Current-page-only is a non-goal. | 2026-09-24 |
| Are only EXTRACTED and FINALIZED filterable?                                                                             | resolved | No. The domain status set is EXTRACTED, FINALIZED, and SUBMITTED_TO_MATHHUB. The examples in the FR are illustrations; all three values are selectable, matching the existing list filter.                                                                                                                                                          | 2026-09-24 |




## Options


| Option                                              | Product impact                                                                                                                                                                                                                   | Engineering cost                                                                                  | Risk                                                                                                                                                                                                       | Recommendation                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **A — Reuse the Modules “Filter by status” Select** | One control. “All statuses” downloads everything (today’s zip). A chosen status downloads only that status. The table and the zip stay aligned. A curator who is browsing FINALIZED and clicks Download all gets FINALIZED only. | Small: pass the current `status` into `listModuleDescriptionsForTexExport`.                       | A curator who filtered the table to browse, then expected a full archive, would get a subset. The button label should make the active filter obvious (for example “Download all” vs “Download finalized”). | **Recommended**                                           |
| **B — Separate status control on Download all**     | The table filter and the zip filter are independent. A curator can browse EXTRACTED and download FINALIZED without changing the table.                                                                                           | Extra UI (second Select or menu) and a second piece of state to keep consistent with IndexStatus. | Two status controls on one page; easy to download the wrong set.                                                                                                                                           | Not recommended unless the table and the zip must diverge |


**Chosen approach:** **A** — Abhishek Chugh, 2026-09-24. Download all uses the Modules “Filter by status” Select. The button text updates with that selection so the user can see what will be downloaded. Option B is rejected. 

## v1 scope

- Curator or Admin only (unchanged R-MOD-15).
- Optional single index status on Download all: unset means every module description; set means only rows with that `indexStatus`. In both cases the zip is every matching row, ignoring table pagination.
- Status values: EXTRACTED, FINALIZED, SUBMITTED_TO_MATHHUB.
- Zip contents for included rows stay as today: module TeX for duplicates and non-duplicates; definition TeX only for non-duplicates; duplicate composition per R-MOD-23.
- Empty match: the existing “No module descriptions to export” failure (no empty zip).
- Button label names the set that will be downloaded (status only — not a row count, because the table total also applies favorites and module-ID filters that do not apply to the zip):
  - no status selected → **Download all**
  - EXTRACTED → **Download extracted**
  - FINALIZED → **Download finalized**
  - SUBMITTED_TO_MATHHUB → **Download submitted**



## Non-goals and v2



### Non-goals (not in this change)

- Applying **Show only favorites** or the module-ID query to the zip.
- Multi-select (for example EXTRACTED and FINALIZED in one zip while excluding SUBMITTED_TO_MATHHUB).
- Changing single-module Preview LaTeX on `/module-description/$moduleId`.
- Changing who may export, index-status edit rights, or TeX/URI generation.
- Scheduled or automatic export by status (PRD out of scope: index-status-driven export jobs).
- Exporting only the current page of the table.



### v2 (separate FR later)

N/A — no deferred product slice. Multi-status and favorites-scoped download are non-goals, not a planned follow-up, unless a later FR asks for them.

## PRD change decision

- [x] **PRD delta required** — **R-MOD-24** today requires a bulk export of **all** descriptions (every duplicate and every canonical module file). v1 must say: when no status is selected, that rule still holds; when a status is selected, the zip includes only descriptions with that index status (duplicate module files included only when that duplicate’s status matches; canonical module files only when that canonical’s status matches). Definition-file and Extractor rules stay as they are.
- [ ] **No PRD change**

**Human confirmation:** PRD delta required — Abhishek Chugh, 2026-09-24. When a status is selected, R-MOD-24 covers every matching row, not the current page. When no status is selected, bulk export of every description is unchanged. 

## Accepted tradeoffs

| Original ask | What v1 ships instead | Why acceptable | Agreed by | Date |
| --- | --- | --- | --- | --- |
| Ability to filter Download all by status (examples EXTRACTED / FINALIZED) | Option A: the existing list status Select drives the zip. Button text names the status. All three index statuses are selectable, including SUBMITTED_TO_MATHHUB. | One control; the label prevents downloading a filtered set by surprise. | Abhishek Chugh | 2026-09-24 |

---



## Human decisions (required before Propose)

Complete every applicable item. **Propose must not start** until all are checked and signed.

- [x] **Restatement** — outcome matches what PM / requester actually asked for (or documented adjustment).
- [x] **Upstream audit** — compliance pass, or HALT escalated with owner; ADR conflicts resolved or superseding ADR planned.
- [x] **Open questions** — no unresolved blocking questions; deferrals have owner and date.
- [x] **Approach** — option chosen (with PM when product impact or compromise is on the table), or N/A with recommendation accepted.
- [x] **v1 scope** — shippable slice approved.
- [x] **Non-goals / v2** — deferred work explicit; nothing smuggled into v1.
- [x] **PRD change** — PRD delta vs **No PRD change** confirmed.
- [x] **Tradeoffs** — engineer + PM sign-off when the product promise changed (P2).

**Lock it — sign-off**

```
Clarify approved: Abhishek Chugh — 2026-09-24
Propose may begin.
```

