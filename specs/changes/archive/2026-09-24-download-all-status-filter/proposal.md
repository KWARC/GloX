# Proposal: Filter Download all by module-description index status

> **Layer:** *what* — intent, scope, and **PRD delta**. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical PRDs until Archive.
>
> **Policy:** `proposal.md` records *what* (including an optional PRD delta). `design.md` records *how*
> (the SDD delta). `tasks.md` records *do* — atomic Apply steps only, with no new requirements.
>
> **Prerequisites:** Signed [`clarify.md`](./clarify.md) (**Lock it**, Abhishek Chugh — 2026-09-24).

---

## Intent and scope

Curators and Admins use **Download all** on `/module-descriptions` to take a TeX zip of module
descriptions. Today that zip always contains every description, even when the Modules list is
filtered by index status. v1 makes that existing status filter choose the zip, and changes the
button label so the set is visible before the click.

When the filter is All statuses, the zip is still every in-progress module description. When the
filter is one status (Extracted, Finalized, or Submitted to MathHub), the zip contains every
description with that status, including rows on other pages of the table. Favorites and the
module-ID search do not change the zip. Extractors still cannot export. Per-description TeX
(including duplicate composition) is unchanged for rows that are included.

This is the locked restatement from [`clarify.md`](./clarify.md) (Abhishek Chugh, 2026-09-24).

## Non-goals

- Applying **Show only favorites** or the module-ID search to the zip.
- Selecting more than one status in one zip.
- Changing single-module Preview LaTeX.
- Changing who may export, who may edit index status, or how TeX is generated.
- Exporting only the current page of the Modules table.
- Scheduled or automatic export by status.

## Iteration plan

### v1 (this change)

- The Modules **Filter by status** control drives Download all.
- Unset filter: every module description. One status: every description with that status, not the
  current page.
- Button labels: **Download all**, **Download extracted**, **Download finalized**, **Download
  submitted**.
- No matching descriptions: refuse the export and do not download an empty archive.
- PRD delta amends **R-MOD-24** and adds **R-MOD-32**. Export SDD delta in `design.md`.

### v2 (after user feedback — separate FR)

N/A. Multi-status and favorites-scoped download are non-goals, not a planned follow-up.

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | done | From signed `clarify.md`: [`prds/domains/module-descriptions.md`](../prds/domains/module-descriptions.md) **R-MOD-24** (bulk export of every duplicate and canonical module file; no status predicate), **R-MOD-11 / R-MOD-12 / R-MOD-23** (per-row TeX and duplicate composition), **R-MOD-15** (Extractors must not export), **R-MOD-02** (list status filter does not govern the zip). [`export.md`](../engineering/features/module-descriptions/export.md) **S-MOD-24**. Index statuses: Extracted, Finalized, Submitted to MathHub. |
| ADR alignment | pass | No ADR requires an unfiltered bulk export. Export stays client-side. No new ADR. |
| Compliance | pass | No compliance PRD. Export identity and URI rewriting are unchanged. |
| Blocking questions | none | Clarify Lock it 2026-09-24. |

## PRD delta

Fold into [`specs/prds/domains/module-descriptions.md`](../prds/domains/module-descriptions.md) at
Archive. Do not edit the canonical PRD until then.

Keep **R-MOD-11**, **R-MOD-12**, **R-MOD-15**, and **R-MOD-23** unchanged. Replace **R-MOD-24**.
Add **R-MOD-32**.

### Product outcomes (replace R-MOD-24)

**R-MOD-24 (Event-Driven):** WHEN a Curator or Admin exports all module descriptions and no index
status is selected, the system MUST include the module TeX file for each duplicate description and
for each canonical description.

WHEN a Curator or Admin exports all module descriptions and one index status is selected, the
system MUST include the module TeX file for every description with that status, including
descriptions that are not on the current page of the module list. A duplicate’s module file is
included only when that duplicate’s status matches. A canonical description’s own module file is
included only when that canonical description’s status matches. WHEN an included duplicate’s
canonical description has a different status, the duplicate’s Inhalt and Lernziele MUST still follow
**R-MOD-23**.

WHEN no description matches the selected status, the system MUST NOT download an archive and MUST
tell the user there are no module descriptions to export.

The system MUST NOT omit a matching description because **Show only favorites** is on or because a
module-ID search is set. The system MUST NOT limit the archive to the current page of the module
list.

**Rationale:** Status is a publication-readiness gate. Curators need a zip of one status without
losing rows that sit on later pages, and without the list’s other filters silently shrinking the
archive.

### Product outcomes (add)

**R-MOD-32 (State-Driven):** WHILE a Curator or Admin can export all module descriptions, the
bulk-export control MUST name the set that will be downloaded: “Download all” when no index status
is selected, “Download extracted” when Extracted is selected, “Download finalized” when Finalized
is selected, and “Download submitted” when Submitted to MathHub is selected.

**Rationale:** The same control both filters the list and chooses the archive. The label is the
warning that the click is not always the full catalog.

### Out of scope (add bullets)

- Favorites-only or module-ID limits on bulk TeX export
- Multi-status bulk export
- Bulk export of only the current page
- Scheduled export by index status

### Traceability (add or update rows)

| PRD rule | SDD rule(s) |
| --- | --- |
| R-MOD-24 | `design.md` (export SDD; Archive → `export.md` S-MOD-24) |
| R-MOD-32 | `design.md` (export SDD; Archive → `export.md`) |

## Upstream links

| Kind | Link |
| --- | --- |
| Compliance | None |
| Commercial | N/A |
| Product context (orientation) | [`specs/product/glox-features.md`](../product/glox-features.md) — module descriptions |
| Existing PRDs | [`module-descriptions.md`](../prds/domains/module-descriptions.md) |
| Existing SDD | [`export.md`](../engineering/features/module-descriptions/export.md) |
| Signed Clarify | [`clarify.md`](./clarify.md) |

## Resolved questions

| Question | Resolution | Owner | Date |
| --- | --- | --- | --- |
| Separate download filter or the list’s status filter? | Option A. The Modules “Filter by status” control drives the zip. Option B (a second control) is rejected. | Abhishek Chugh | 2026-09-24 |
| Button text? | The label changes with the selection: Download all / Download extracted / Download finalized / Download submitted. No row count. | Abhishek Chugh | 2026-09-24 |
| Favorites or module-ID search on the zip? | No. Those filters stay on the list only. | Abhishek Chugh | 2026-09-24 |
| Duplicate whose canonical has another status? | The duplicate is included only when its own status matches. Its Inhalt and Lernziele still come from the canonical description (R-MOD-23). The canonical’s own module file is included only when the canonical status matches. | Abhishek Chugh | 2026-09-24 |
| Current page or every match? | Every match. Example: 200 Finalized descriptions, table on page 3 of 10 → the zip contains all 200. All statuses still means every description. | Abhishek Chugh | 2026-09-24 |
| Only Extracted and Finalized? | No. Submitted to MathHub is included. The three list statuses are the filter values. | Abhishek Chugh | 2026-09-24 |
| PRD change? | Required. Amend R-MOD-24; add the button-label rule. | Abhishek Chugh | 2026-09-24 |

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4):

Upstream review: Abhishek Chugh — 2026-09-24
Scope: proposal
Teach-back: confirmed
-->
