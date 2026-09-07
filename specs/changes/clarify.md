# Clarify: Module description favorites filter

> **Phase:** Clarify — decision record before delta files. Copy from `_TEMPLATE/` at the start of
> Clarify; update iteratively until the human signs off. Do **not** draft `proposal.md`, `design.md`,
> or `tasks.md` until **Human decisions** below are complete and signed.
>
> **Canonical guide:** [CLARIFY_AND_PROPOSE.md](../CLARIFY_AND_PROPOSE.md).

---

## Feature request (input)

Users can mark module descriptions as favorites and use a “Show only favorites” filter to quickly
find the module descriptions they are currently working on.

Requester asked for **full SDD**. Matches [DEVELOPER_GUIDE §1](../DEVELOPER_GUIDE.md#1-choose-your-mode):
auth / user-data and authorization (favorites are per-user state on a shared module list).

## Restatement

On `/module-descriptions`, an authenticated Extractor, Curator, or Admin can mark (and unmark) an
**in-progress ModuleDescription** as a personal favorite, then turn on **Show only favorites** so the
Modules table lists only those they favorited. Favorites are **per user**: they do not change the
shared module catalog, other users’ lists, or who may open a module workspace. Catalog search,
workspace editing, index status, and TeX export stay as today except that the Modules list gains the
toggle and filter.

**Human approval:** approved on 2026-09-04 by Keerthan K

## Upstream audit

| Check | Result | Notes |
| --- | --- | --- |
| Specs read | done | [`prds/domains/module-descriptions.md`](../prds/domains/module-descriptions.md) **R-MOD-02** — list in-progress descriptions with pagination and optional **index status** filter; no favorites. **R-MOD-13** — Extractor+ only (must still apply to favorite mutations and filtered list). [`workspace.md`](../engineering/features/module-descriptions/workspace.md) **S-MOD-02** — `listModuleDescriptions` paginates with optional `indexStatus` and `moduleId` query; **S-MOD-13** — dedicated module serverFns reject unauthenticated / non-Extractor+. [`prds/domains/auth.md`](../prds/domains/auth.md) — sessions and Admin user listing; no user-preference store. [`prds/domains/documents-extraction.md`](../prds/domains/documents-extraction.md) — Documents are **per-user**; ModuleDescriptions are **not**. [`product/glox-features.md`](../product/glox-features.md) — Modules list + catalog search; no favorites. Domain dictionary has `module_description`, no “favorite”. |
| ADR alignment | pass | No `D-*` covers user bookmarks or list filters. JWT fingerprint / password storage ADRs unchanged. No new ADR unless Propose invents a cross-cutting preferences platform (not recommended for v1). |
| Compliance | pass | No compliance PRDs on this domain (`compliance: []` on module-descriptions PRD). No vendor contradiction. |
| Blast radius (`code` in frontmatter) | list UI + module serverFns + new Prisma table | [`src/routes/module-descriptions/index.tsx`](../../src/routes/module-descriptions/index.tsx) Modules table (status Select, module-ID filter, pagination). [`src/serverFns/moduleDescription.server.ts`](../../src/serverFns/moduleDescription.server.ts) `listModuleDescriptions` returns **all** ModuleDescription rows for Extractor+ (not scoped to `createdById`). [`prisma/schema.prisma`](../../prisma/schema.prisma) — new favorites table; `ModuleDescription` stays without a shared favorite flag. Does **not** change FloDown, symbols, FTML export, catalog search, JWT cookies, or Document ownership. |
| Blocking questions | none if recommendations accepted | See Open questions — all have a recommended resolution for Lock it. |

**Code fact (not a spec gap):** The in-progress Modules table is a **shared** Extractor+ inventory.
Documents stay private per `userId`. A boolean on `ModuleDescription` would make stars global. The FR
(“the module descriptions **they** are currently working on”) only holds if favorites are **personal**.

## Open questions

| Question | Status | Resolution / owner | Date |
| --- | --- | --- | --- |
| Are favorites personal or shared across all Extractor+ users? | resolved | **Personal.** Recommendation: per-user association; never show or mutate another user’s favorite set. | 2026-09-04 |
| Where can the user toggle a favorite? | resolved | **Modules table only** in v1 (control on each in-progress row). Not catalog search, not workspace, not bulk. | 2026-09-04 |
| If “Show only favorites” is on and the user also set “Filter by status” or “Filter by module ID”, what does the table show? | resolved | The table shows only rows that satisfy **all** of those that are set. Example: favorites + status FINALIZED → favorite modules that are FINALIZED, not every favorite. “Show only favorites” starts off. Pagination is over that result. | 2026-09-04 |
| Persist in the database or only in the browser? | resolved | **Database, as a new table.** Add a named Prisma/PostgreSQL favorites model (user id + module description id, unique per pair). Not an implicit many-to-many join, not a column on `ModuleDescription`, not browser-only storage. | 2026-09-04 |
| What happens when a favorited module description is deleted? | resolved | Rows in the favorites table for that ModuleDescription are removed with it (no dangling favorites, no error on list). | 2026-09-04 |

## Options

| Option | Product impact | Engineering cost | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| **A — Per-user server favorites** | Each GloXer keeps a private working set on the shared Modules list; filter finds “what I’m working on.” | New favorites table, list/toggle serverFns, list UI. | Low if scoped to caller’s user id; must not leak others’ ids. | **Yes — v1** |
| **B — Shared star on ModuleDescription** | One team-wide star; “my work” is wrong when several extractors share the list. | Smaller schema, worse product. | High product mismatch; noisy shared flag. | No |
| **C — Browser-only (localStorage)** | Fast, no migration; lost on new browser / cleared storage; not auth-bound. | UI-only. | Favorites are user data without server enforcement; contradicts full-SDD reason for this FR. | No |

**Chosen approach:** Option A — per-user favorites in an explicit named table (Keerthan K, 2026-09-04).

Recommendation for Lock it: **Option A**, with an **explicit favorites table** (not Prisma implicit
M2M, not a flag on `ModuleDescription`). List responses include whether the **current caller**
favorited each row. Toggle and “show only favorites” require the same Extractor+ gate as other module
list operations (**R-MOD-13**). Do not add a general “user preferences” subsystem. Table column
details stay for design.md.

## v1 scope

- Extractor, Curator, or Admin can favorite / unfavorite an existing in-progress ModuleDescription
  from the Modules table on `/module-descriptions`.
- A **Show only favorites** control filters that table to the caller’s favorites (composes with
  existing status and module-ID filters; pagination unchanged in kind).
- Favorites live in a **new database table** keyed by user and ModuleDescription; list and
  mutations only use the caller’s rows.
- Empty filtered list is allowed (no invented rows).
- Specs: PRD + workspace SDD deltas; product inventory line after Archive.
- Auth: unauthenticated and non-Extractor+ callers rejected on favorite toggle and on the list
  (existing list gate).

## Non-goals and v2

### Non-goals (not in this change)

- Favoriting catalog search hits that have **no** ModuleDescription yet.
- Shared / team / Admin-visible favorite lists.
- Sorting the unfiltered Modules table to pin favorites at the top.
- Workspace (`/$moduleId`) favorite control.
- Folders, tags, notes, or a count badge beyond the filter.
- Persisting the filter toggle itself in the user profile or URL as a product promise.
- Changing who can see the shared in-progress list (`createdById` remains metadata, not a visibility
  rule).
- FloDown, symbols, catalog hierarchy, index-status role gates, TeX export.

### v2 (separate FR later)

- Favorite control on the module workspace.
- Optional: pin favorites to the top of the unfiltered list.
- Optional: catalog “watch” before create (different object than ModuleDescription).
- Optional: shareable filtered URL.

## PRD change decision

- [x] **PRD delta required** — new or changed binding outcomes for v1
- [ ] **No PRD change** — governed by: <!-- links -->

**Recommendation:** **PRD delta required.** Users will see new controls and a different list when the
filter is on — that is a product outcome, not only stack wiring. Keep **R-MOD-13**. Extend or sibling
**R-MOD-02**: today’s list promise is pagination + optional index-status filter only. Add rules for
(1) mark/unmark personal favorite, (2) optional favorites-only list filter, (3) MUST NOT expose or
mutate another user’s favorites. SDD will name the favorites table, list/toggle serverFns, and
how the filter stacks with existing filters.

**Human confirmation:** Keerthan K, 2026-09-04

## Accepted tradeoffs

N/A — v1 ships the original ask as Option A (personal favorites, Modules-table toggle, explicit
favorites table).

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
Clarify approved: Keerthan K — 2026-09-04
Propose may begin.
```
