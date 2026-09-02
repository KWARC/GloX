# Proposal: Catalog search faculty and subject area

> **Layer:** *what* — intent, scope, and optional **PRD delta**. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical PRDs until Archive.
>
> **Policy:** `proposal.md` records *what* (including an optional PRD delta). `design.md` records *how*
> (the SDD delta). `tasks.md` records *do* — atomic Apply steps only, with no new requirements.
>
> **Prerequisites:** Signed [`clarify.md`](./clarify.md) (**Lock it**). Complete
> [Clarify](./CLARIFY_AND_PROPOSE.md#phase-a--clarify) before drafting this file.

---

## Intent and scope

On the Module descriptions catalog search page, extractors need to tell modules apart by faculty and
subject area. v1 shows each catalog search hit’s faculty and subject area in muted text beneath the
title, sourced from the FAU hierarchy catalog file (`hierarchy.json` under `MODULES_DIR`), and orders
hits by faculty first, then subject area. Matching rules and Extractor+ access stay as today.

This is the locked restatement from [`clarify.md`](./clarify.md) (Keerthan K, 2026-09-02).

## Non-goals

- In-progress **Modules** table (ID / title / lang / status / updated).
- Module workspace “Organization & programs” panel (already uses per-module JSON).
- Filter or facet UI by faculty or subject area.
- Changing search match rules, result limit, or who may search.
- Live Campo/StudOn catalog; writing organization fields into per-module JSON as part of this FR
  (hierarchy is the search-list source).
- Auth, FloDown, symbols, or TeX export.
- German locale-aware sort (umlauts) as a product promise.

## Iteration plan

### v1 (this change)

- Catalog search results on `/module-descriptions` show faculty and subject area in muted text under
  the title when those fields are present in `hierarchy.json`.
- Results are ordered by faculty, then subject area (stable tertiary order defined in SDD).
- Search payload exposes the same two fields (`null` when absent); omit invented labels when missing.
- PRD delta on module-descriptions; workspace SDD delta in `design.md`.

### v2 (after user feedback — separate FR)

- Filter catalog search by faculty / subject area.
- Apply the same subtitle + sort to the in-progress Modules list if product wants parity.
- Locale-aware German sort if extractors notice umlaut ordering.

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | done | From signed `clarify.md`: [`prds/domains/module-descriptions.md`](../prds/domains/module-descriptions.md) R-MOD-01 / R-MOD-13; [`engineering/features/module-descriptions/workspace.md`](../engineering/features/module-descriptions/workspace.md) S-MOD-01 + org data contract; [`product/glox-features.md`](../product/glox-features.md) FAU module catalog search. |
| ADR alignment | pass | No `D-*` covers catalog search ranking or organization display. No new ADR. |
| Compliance | pass | File-based catalog only. No vendor/compliance PRD contradiction. |
| Blocking questions | none | Clarify open questions resolved; Lock it signed 2026-09-02. |

## PRD delta

Fold into [`specs/prds/domains/module-descriptions.md`](../prds/domains/module-descriptions.md) at
Archive. Do not edit the canonical PRD until then.

Keep **R-MOD-01** (return matching modules) and **R-MOD-13** (Extractor+ access) unchanged.

### Product outcomes (add)

**R-MOD-16 (Event-Driven):** WHEN an authenticated Extractor, Curator, or Admin searches the module
catalog, the system MUST present each matching module’s faculty and subject area from the configured
FAU hierarchy catalog beneath that module’s title when those values are present.

**R-MOD-17 (Event-Driven):** WHEN an authenticated Extractor, Curator, or Admin searches the module
catalog, the system MUST order matching modules by faculty first, then by subject area.

**R-MOD-18 (Ubiquitous):** WHEN a matching module has no faculty or subject area in the hierarchy
catalog, the system MUST NOT invent a faculty or subject area label for that search result.

### Out of scope (add bullets)

- Faculty / subject area subtitle or sort on the in-progress Modules list
- Catalog search filter or facet by faculty or subject area
- German locale-specific sort of faculty or subject area as a product promise

### Traceability (add rows)

| PRD rule | SDD rule(s) |
| --- | --- |
| R-MOD-16 | `design.md` (workspace SDD; Archive → `workspace.md`) |
| R-MOD-17 | same |
| R-MOD-18 | same |

## Upstream links

| Kind | Link |
| --- | --- |
| Compliance | None in `/specs/prds/compliance/` |
| Commercial | N/A |
| Product context (orientation) | [`specs/product/glox-features.md`](../product/glox-features.md) — FAU module catalog search |
| Existing PRDs | [`module-descriptions.md`](../prds/domains/module-descriptions.md) |
| Existing SDD | [`workspace.md`](../engineering/features/module-descriptions/workspace.md) |
| Signed Clarify | [`clarify.md`](./clarify.md) |

## Resolved questions

| Question | Resolution | Owner | Date |
| --- | --- | --- | --- |
| When `faculty` or `subjectArea` is missing, what does the subtitle show? | Omit the gray line (or the missing part). Do not invent “Unclassified”. | Keerthan K | 2026-09-02 |
| When two hits share the same faculty and subject area, what is the next sort key? | Title (case-insensitive), then `moduleId`, for a stable order. (SDD / code; not a separate PRD MUST.) | Keerthan K | 2026-09-02 |
| German locale rules vs default string compare? | Default runtime string compare in v1 (same pattern as existing bare `localeCompare`); no locale-specific product promise. | Keerthan K | 2026-09-02 |

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4):

Upstream review: <name> — <date>
Scope: proposal
Teach-back: confirmed
-->
