# Proposal: Module description favorites filter

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

Extractors share one in-progress Modules list. They need a private way to mark the module
descriptions they are working on and to list only those. v1 lets an authenticated Extractor, Curator,
or Admin favorite and unfavorite an existing ModuleDescription from that table and turn on **Show
only favorites**. Favorites are personal: they do not change the shared catalog, other users’ lists,
or who may open a workspace.

This is the locked restatement from [`clarify.md`](./clarify.md) (Keerthan K, 2026-09-04).

## Non-goals

- Favoriting catalog search hits that have no ModuleDescription yet.
- Shared, team, or Admin-visible favorite lists.
- Sorting the unfiltered Modules table to pin favorites at the top.
- Favorite control on the module workspace (`/$moduleId`).
- Folders, tags, notes, or a count badge beyond the filter.
- Persisting the filter toggle in the user profile or URL as a product promise.
- Changing who can see the shared in-progress list (`createdById` remains metadata).
- FloDown, symbols, catalog hierarchy, index-status role gates, TeX export.

## Iteration plan

### v1 (this change)

- Toggle favorite / unfavorite on each in-progress Modules table row on `/module-descriptions`.
- **Show only favorites** limits that table to the caller’s favorites; it starts off; it stacks with
  existing status and module-ID filters; pagination still covers the combined result.
- Empty filtered list is allowed.
- Personal persistence (other users’ favorites neither shown nor changed).
- PRD delta on module-descriptions; workspace SDD delta in `design.md`. Product inventory line at
  Archive.

### v2 (after user feedback — separate FR)

- Favorite control on the module workspace.
- Optional: pin favorites to the top of the unfiltered list.
- Optional: catalog “watch” before create (different object than ModuleDescription).
- Optional: shareable filtered URL.

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | done | From signed `clarify.md`: [`prds/domains/module-descriptions.md`](../prds/domains/module-descriptions.md) **R-MOD-02** (list + pagination + optional index status; no favorites), **R-MOD-13** (Extractor+). [`workspace.md`](../engineering/features/module-descriptions/workspace.md) **S-MOD-02**, **S-MOD-13**. Auth and documents PRDs: no user-preference store; Documents are per-user, ModuleDescriptions are shared. |
| ADR alignment | pass | No `D-*` for bookmarks. No new ADR (no general preferences platform). |
| Compliance | pass | `compliance: []` on module-descriptions PRD. |
| Blocking questions | none | Clarify Lock it 2026-09-04. |

## PRD delta

Fold into [`specs/prds/domains/module-descriptions.md`](../prds/domains/module-descriptions.md) at
Archive. Do not edit the canonical PRD until then.

Keep **R-MOD-02** (in-progress list, pagination, optional index-status filter) and **R-MOD-13**
(Extractor+ access) unchanged. Do not overload **R-MOD-02** with favorites.

### Product outcomes (add)

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

### Out of scope (add bullets)

- Favoriting catalog modules that have no in-progress ModuleDescription
- Shared or Admin-visible favorite lists
- Pinning favorites to the top of the unfiltered Modules list
- Favorite control on the module workspace

### Traceability (add rows)

| PRD rule | SDD rule(s) |
| --- | --- |
| R-MOD-26 | `design.md` (workspace SDD; Archive → `workspace.md`) |
| R-MOD-27 | same |
| R-MOD-28 | same |

## Upstream links

| Kind | Link |
| --- | --- |
| Compliance | None in `/specs/prds/compliance/` |
| Commercial | N/A |
| Product context (orientation) | [`specs/product/glox-features.md`](../product/glox-features.md) — Module descriptions list |
| Existing PRDs | [`module-descriptions.md`](../prds/domains/module-descriptions.md) |
| Existing SDD | [`workspace.md`](../engineering/features/module-descriptions/workspace.md) |
| Signed Clarify | [`clarify.md`](./clarify.md) |

## Resolved questions

| Question | Resolution | Owner | Date |
| --- | --- | --- | --- |
| Personal vs shared favorites? | Personal. Never show or mutate another user’s favorite set. | Keerthan K | 2026-09-04 |
| Where is the toggle? | Modules table only in v1. Not catalog search, workspace, or bulk. | Keerthan K | 2026-09-04 |
| Favorites + status / module-ID filters? | Table shows only rows that satisfy **all** set filters. Favorites filter starts off. Pagination over that result. | Keerthan K | 2026-09-04 |
| Database vs browser? | New named Prisma/PostgreSQL favorites table (user + module description, unique pair). Not implicit M2M, not a column on `ModuleDescription`, not browser-only. | Keerthan K | 2026-09-04 |
| Delete a favorited module description? | Favorites-table rows for that description are removed with it. | Keerthan K | 2026-09-04 |
| Approach? | Option A — per-user server favorites, explicit table. | Keerthan K | 2026-09-04 |

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4):

Upstream review: Keerthan K — 2026-09-07
Scope: proposal
Teach-back: confirmed
-->
