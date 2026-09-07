# Tasks: Module description favorites filter

> **Layer:** *do* — atomic Apply checklist only. **Do not add new requirements here** — trace each
> step to `proposal.md` or `design.md`. Copy from `_TEMPLATE/` into `/specs/changes/`.
>
> **Depends on:** Signed `clarify.md` and upstream-reviewed `design.md`. Red-phase test tasks run before implementation tasks.

---

## Red phase (tests must fail first)

- [x] Add contract tests in `src/server/modules/moduleDescriptionFavorite.test.ts` for S-MOD-28 named model + unique pair; S-MOD-29 cascade; S-MOD-27 toggle export; S-MOD-13 toggle auth (no client `userId`); S-MOD-26 `favoritesOnly` + `isFavorite` — [design.md](./design.md) Test mapping.
- [x] Add Postgres integration tests (TESTING_GUIDE harness) for S-MOD-27 insert/unfavorite, S-MOD-26 favorites-only + status stack + empty list + caller `isFavorite`, S-MOD-28 isolation, S-MOD-29 leftover rows — [design.md](./design.md). **Waiver:** no fixture harness; contract tests cover schema/serverFn names. Isolation remains a code-review concern (`userId` from `requireExtractorPlus` only).
- [x] Run contract tests and confirm they **FAIL** for the right reason (no favorites model / no toggle / no list fields) before Implementation.

**Red run (2026-09-07):** `pnpm exec vitest run src/server/modules/moduleDescriptionFavorite.test.ts` — 5 failed / 1 passed.

Failures (missing implementation, not syntax): no `ModuleDescriptionFavorite` model; no `toggleModuleDescriptionFavorite`; `listModuleDescriptions` has no `favoritesOnly` / `isFavorite`.

Pass (already true): S-MOD-28 MUST NOT shared `favorite` boolean on `ModuleDescription`.

## Implementation

- [x] Add named Prisma favorites model (user id + module description id, unique pair, cascade on ModuleDescription delete). Not implicit M2M, not a boolean on `ModuleDescription` — S-MOD-28, S-MOD-29; [design.md](./design.md) Data contracts. Migrate.
- [x] Extend `listModuleDescriptions`: `isFavorite` for the caller; optional favorites-only filter stacked with existing `status` / `query`; empty set allowed — S-MOD-26; [proposal.md](./proposal.md) R-MOD-27.
- [x] Add dedicated toggle serverFn with `requireExtractorPlus`; insert/delete only the caller’s row — S-MOD-27, S-MOD-13, S-MOD-28; [proposal.md](./proposal.md) R-MOD-26 / R-MOD-28.
- [x] Confirm `deleteModuleDescription` leaves no favorites rows (schema cascade or explicit delete) — S-MOD-29; [design.md](./design.md).
- [x] Modules table on `src/routes/module-descriptions/index.tsx` only: per-row favorite control; **Show only favorites** starts off and stacks with status and module-ID filters — S-MOD-26, S-MOD-27; [proposal.md](./proposal.md) R-MOD-26 / R-MOD-27. Do not change catalog search or `$moduleId` workspace.

## Verify

- [x] Re-run Red-phase tests; mapped S-MOD-26 / S-MOD-27 / S-MOD-28 / S-MOD-29 cases green (or documented waiver).
- [x] Confirm no untraced EARS rules from [design.md](./design.md) Test mapping (UI optional beyond contract; S-MOD-13 toggle auth if waived).
- [x] `pnpm typecheck` on touched files (or project-equivalent); no new errors in blast radius.

**Apply run (2026-09-07):** `pnpm exec vitest run src/server/modules/moduleDescriptionFavorite.test.ts` — 6 passed. `pnpm typecheck` passed. Migration `20260907120000_module_description_favorite` applied on local `glox`. UI not browser-exercised (no browser tools in this session).

---

## Verify (REVIEW_GUIDE §1.5)

```
Verify: 2026-09-07
Human sign-off (cursory): Keerthan K — 2026-09-07
Outcome: pass with waivers (see below); prerequisite gap — no recorded PR / tiered code review
```

### Agent checklist

| Check | Result |
| --- | --- |
| Every `tasks.md` item done or deferred | **pass** — Red / Implementation / Apply-time Verify all `[x]`; Postgres integration **waiver** (no harness) |
| Mapped tests green; every `MUST NOT` has negative test or waiver | **pass** — `moduleDescriptionFavorite.test.ts` 6/6 green (re-run 2026-09-07). S-MOD-28 named model + no shared boolean. Toggle has no `data.userId`. **Waiver:** two-user isolation / stacked-status / empty-list / delete leftover rows not exercised against Postgres. **Waiver (design):** UI optional beyond contract. |
| `design.md` decisions reflected in shipped code | **pass** — see teach-back |
| `proposal.md` PRD delta matches shipped | **pass** — R-MOD-26/27/28 shipped; non-goals respected (no catalog starring, no workspace star, no shared list, no pin-to-top) |
| Teach-back without relying only on git diff | **pass** — see below |

### Teach-back (shipped rules)

- **R-MOD-26 / S-MOD-27:** Extractor+ can favorite or unfavorite from the Modules table; `toggleModuleDescriptionFavorite` writes only that caller’s `ModuleDescriptionFavorite` row.
- **R-MOD-27 / S-MOD-26:** List includes `isFavorite` for the caller. **Show only favorites** starts off and stacks with status and module ID; empty result is allowed.
- **R-MOD-28 / S-MOD-28:** Named `ModuleDescriptionFavorite` table (unique user + module description). No favorite boolean on `ModuleDescription`. Toggle `userId` comes from `requireExtractorPlus`, not the client body.
- **S-MOD-29:** Favorites FK `onDelete: Cascade` on ModuleDescription.
- **S-MOD-13:** Toggle is a dedicated module serverFn gated by `requireExtractorPlus`.

UI polish after Apply (tooltip, unfavorite confirm, filter order) does not change those rules.

### Waivers / gaps (human-owned)

1. **Prerequisite:** Verify normally follows a PR and tiered code review — not recorded here.
2. **Postgres integration:** no fixture harness; isolation / filter-stack / cascade leftovers not DB-tested.
3. **UI E2E:** not configured; browser check is manual.
4. **Canonical specs:** still only in `/specs/changes/` until Archive.

<!-- After cursory human sign-off: Archive —
     fold deltas into canonical specs and move this set to
     /specs/changes/archive/YYYY-MM-DD-module-description-favorites/. -->

