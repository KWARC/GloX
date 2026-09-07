# Design: Module description favorites filter

> **Layer:** *how* — **SDD / tech-spec delta** for the current stack. Copy from `_TEMPLATE/` into
> `/specs/changes/`. Do not edit canonical tech specs until Archive.
>
> **Depends on:** Signed `clarify.md`; `proposal.md` reviewed. SDD = policy and boundaries on the current stack — not pseudo-code.
> See [spec-authoring §7](../engineering/spec-authoring.md#7-what-belongs-in-prd-sdd-and-code).

---

## SDD delta

Fold at Archive into
[`specs/engineering/features/module-descriptions/workspace.md`](../engineering/features/module-descriptions/workspace.md).
Do not edit that canonical path until Archive.

This SDD implements proposal PRD rules **R-MOD-26**, **R-MOD-27**, and **R-MOD-28**. It extends the
in-progress Modules list only. **S-MOD-02** (paginated list, optional `indexStatus` and `moduleId`
filters) and **S-MOD-13** (Extractor+ on dedicated module serverFns) stay in force. It does not change
catalog search, workspace statement/definition editing, index-status role gates, FloDown, symbols, or
export.

### Domain context (delta)

The Modules table on `/module-descriptions` remains a shared Extractor+ inventory. v1 adds a
**personal** favorite per caller, stored in a named favorites table, a row toggle on that table, and
an optional **Show only favorites** filter that stacks with existing list filters.

Out of scope (proposal Non-goals / siblings):

- Catalog search table
- Module workspace (`$moduleId.tsx`)
- Module TeX export — [`export.md`](../engineering/features/module-descriptions/export.md)

### Architecture boundaries (delta)

| Layer | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | Named `ModuleDescriptionFavorite` model (schema below). Not implicit many-to-many, not a flag on `ModuleDescription`. Unique `(userId, moduleDescriptionId)`. FKs cascade when the ModuleDescription or User is deleted. |
| `src/serverFns/moduleDescription.server.ts` | `listModuleDescriptions` stays `requireExtractorPlus`; each item includes whether the **caller** favorited that row; optional favorites-only filter uses only the caller’s favorites table rows and stacks with existing `status` / `query` filters. Dedicated toggle serverFn uses `requireExtractorPlus` and inserts or deletes only the caller’s row. |
| `src/routes/module-descriptions/index.tsx` | Modules table: per-row favorite control; **Show only favorites** starts off; empty combined result shows an empty table. Catalog search table unchanged. |

### Data contracts (delta)

| Field / enum | Values / notes |
| --- | --- |
| List item `isFavorite` | Boolean for the **current caller** only. |
| `listModuleDescriptions` filter | Existing `status` / `query` (`moduleId`); new optional favorites-only flag, default off. A returned row MUST match every filter that is set. Pagination (`page`, `pageSize`, `total`) is over that combined set. |

**Favorites table (Prisma, Apply into `prisma/schema.prisma`):** named model `ModuleDescriptionFavorite`.
Not a boolean on `ModuleDescription`. Not Prisma implicit M2M.

```prisma
model ModuleDescriptionFavorite {
  id String @id @default(uuid())

  userId String
  user   User   @relation("ModuleDescriptionFavorites", fields: [userId], references: [id], onDelete: Cascade)

  moduleDescriptionId String
  moduleDescription   ModuleDescription @relation(fields: [moduleDescriptionId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, moduleDescriptionId])
  @@index([userId])
  @@index([moduleDescriptionId])
}
```

On `User`, add `moduleDescriptionFavorites ModuleDescriptionFavorite[] @relation("ModuleDescriptionFavorites")`.
On `ModuleDescription`, add `favorites ModuleDescriptionFavorite[]`. Do not add a shared favorite
boolean on `ModuleDescription`. `onDelete: Cascade` on `moduleDescription` satisfies **S-MOD-29**.
Cascade on `user` drops that user’s favorite rows if the user is deleted (referential integrity;
not a new product surface).

### Business rules (add)

**S-MOD-26 (Event-Driven):** WHEN `listModuleDescriptions` runs, the handler MUST call
`requireExtractorPlus`, MUST include `isFavorite` for the authenticated caller on each item, and
WHEN the caller requests favorites-only, MUST return only ModuleDescription rows that have a
favorites-table row for that caller. WHEN favorites-only is combined with `indexStatus` or `moduleId`
filters, the result MUST include only rows that satisfy every set filter. WHEN no rows match, the
handler MUST return an empty `items` list (and a `total` of zero). The Modules table **Show only
favorites** control MUST start off.

**Upstream:** R-MOD-02, R-MOD-27, R-MOD-28

**S-MOD-27 (Event-Driven):** WHEN the caller favorites or unfavorites a ModuleDescription from the
Modules table, the dedicated toggle serverFn MUST call `requireExtractorPlus` and MUST insert or
delete a row in the named favorites table for **that caller and that ModuleDescription only**. The
Modules table MUST expose the toggle on each in-progress row.

**Upstream:** R-MOD-26, R-MOD-13

**S-MOD-28 (Ubiquitous):** List and toggle handlers MUST NOT return another user’s `isFavorite`, MUST
NOT insert or delete another user’s favorites-table rows, and MUST NOT store favorites as a shared
flag on `ModuleDescription` or as an implicit many-to-many join without a named model.

**Upstream:** R-MOD-28

**S-MOD-29 (Event-Driven):** WHEN `deleteModuleDescription` succeeds, the system MUST leave no
favorites-table rows for that ModuleDescription.

**Upstream:** R-MOD-26 (persistence identity of the description); Clarify delete resolution

### Existing rules (unchanged; still apply)

**S-MOD-02** — `listModuleDescriptions` MUST call `requireExtractorPlus` and MUST return paginated
rows with optional `indexStatus` and `moduleId` filters (now also favorites-only per S-MOD-26).

**Upstream:** R-MOD-02

**S-MOD-08** — delete still removes the ModuleDescription, definition blocks, and orphaned Symbols;
favorites cleanup is S-MOD-29.

**Upstream:** R-MOD-08

**S-MOD-13** — Module description route loaders and dedicated module serverFns MUST reject callers
who are not Extractor, Curator, or Admin (includes the favorite toggle).

**Upstream:** R-MOD-13

## Boundaries

| Area | Paths / identifiers |
| --- | --- |
| Code | `prisma/schema.prisma`; `src/serverFns/moduleDescription.server.ts` (`listModuleDescriptions`, new toggle, `deleteModuleDescription` cascade); `src/routes/module-descriptions/index.tsx` (Modules table only) |
| Data | `ModuleDescriptionFavorite` in `prisma/schema.prisma` (schema in Data contracts); PostgreSQL migration |
| Tenants / tiers | N/A — role gate remains Extractor+; isolation is per `userId`, not a tenant product |
| Out of blast radius | Catalog search; `$moduleId.tsx`; FloDown; symbols; export; JWT cookies; Document ownership |

## ADR alignment

Pass — no new or superseded `D-*` atom. Do not introduce a general user-preferences platform.

## Operations

| Concern | Link or N/A |
| --- | --- |
| Vendors | N/A |
| Deployment / flags | Prisma migrate on deploy; no new env vars |

## Test mapping

| Rule ID / summary | Test (file or describe block) | Layer |
| --- | --- | --- |
| S-MOD-27 / R-MOD-26 — favorite insert and unfavorite delete for caller | Integration: toggle then DB row present / absent for that user + ModuleDescription | integration |
| S-MOD-26 / R-MOD-27 — favorites-only list returns only caller’s favorites | Integration: two users, two modules; caller A favorites one; A’s favorites-only list is that one row | integration |
| S-MOD-26 / R-MOD-27 — favorites-only + status stacks | Integration: favorite EXTRACTED and FINALIZED; filter favorites + FINALIZED → only FINALIZED favorite | integration |
| S-MOD-26 / R-MOD-27 — empty combined list | Integration: favorites-only with no matching rows → `items` `[]`, `total` 0 | integration |
| S-MOD-26 — list `isFavorite` is caller’s | Integration: B favorited a row that A did not; A’s list `isFavorite` false for that row | integration |
| S-MOD-28 / R-MOD-28 — MUST NOT mutate another user’s favorite | Negative integration: A cannot delete B’s favorites-table row via toggle; B’s row still present | integration |
| S-MOD-28 — MUST NOT store as shared ModuleDescription flag / implicit M2M | Schema / contract: named model + unique pair; `ModuleDescription` has no shared favorite boolean | unit / schema |
| S-MOD-29 — delete ModuleDescription removes favorites rows | Integration: favorite then `deleteModuleDescription`; no leftover favorites rows | integration |
| S-MOD-13 — toggle rejects unauthenticated / non-Extractor+ | Integration or existing gap pattern for dedicated module serverFns | integration |
| UI toggle + Show only favorites starts off | Optional beyond server contract; no E2E requirement (Playwright not configured) | optional |

---

<!-- Upstream review sign-off (REVIEW_GUIDE §1.4) — add after review:

Upstream review: Keerthan K — 2026-09-07
Scope: design
Teach-back: confirmed
-->
