# Tasks: Catalog search faculty and subject area

> **Layer:** *do* — atomic Apply checklist only. **Do not add new requirements here** — trace each
> step to `proposal.md` or `design.md`. Copy from `_TEMPLATE/` into `/specs/changes/`.
>
> **Depends on:** Signed `clarify.md` and upstream-reviewed `design.md`. Red-phase test tasks run before implementation tasks.

---

## Red phase (tests must fail first)

- [x] Add unit tests in `src/server/modules/moduleCatalog.test.ts` (or a sibling test file) for S-MOD-16 / R-MOD-16: when the search index is built from hierarchy entries that include `faculty` and `subjectArea`, `searchModules` results MUST carry those values — [design.md](./design.md) Test mapping.
- [x] Add unit test for S-MOD-16 / S-MOD-18 / R-MOD-18: hierarchy entry without `faculty` / `subjectArea` → both fields null on the result; MUST NOT invent a label such as “Unclassified” — [design.md](./design.md).
- [x] Add unit test for S-MOD-17 / R-MOD-17: `searchModules` orders matches by faculty, then subjectArea, then title (case-insensitive), then `moduleId` — [design.md](./design.md).
- [x] Add unit test for S-MOD-17: absent faculty/subjectArea compare as empty string; sort uses default runtime string compare (no German locale argument) — [design.md](./design.md).
- [x] Run the new tests and confirm they **FAIL** for the right reason (index still maps org to null / no sort) before Implementation.

**Red run (2026-09-02):** `pnpm exec vitest run src/server/modules/moduleCatalog.test.ts` — 3 failed / 5 passed.
Fixture under `src/server/modules/__fixtures__/catalog-search/`. Test seam: `resetModuleCatalogForTests`.
Failures: S-MOD-16 receives `faculty`/`subjectArea` null; S-MOD-17 keeps hierarchy encounter order (`m2,m1,m3,m4,m5`).
S-MOD-18 null / no-“Unclassified” assert already passes (current loader always nulls org).

## Implementation

- [x] In `src/server/modules/moduleCatalog.ts` `loadCatalog`: copy hierarchy `faculty` and `subjectArea` into `ModuleSearchResult` (blank/missing → `null`) — S-MOD-16, S-MOD-18; [design.md](./design.md) Architecture boundaries. Do not open per-module JSON for search-list org.
- [x] In `searchModules`: after filtering matches, order by faculty → subjectArea → title (case-insensitive) → `moduleId` with bare `localeCompare` / equivalent; treat null org fields as `""` — S-MOD-17; [design.md](./design.md).
- [x] In `src/routes/module-descriptions/index.tsx` catalog search table only: under the title, render muted faculty / subject area when present; omit missing parts / omit subtitle when both null — S-MOD-16, S-MOD-18; [proposal.md](./proposal.md) R-MOD-16 / R-MOD-18. Do not change the in-progress Modules table.
- [x] Leave `searchModuleDescriptions` auth as `requireExtractorPlus` (S-MOD-01 / S-MOD-13); no auth change — [design.md](./design.md).

## Verify

- [x] Re-run Red-phase unit tests; all mapped S-MOD-16 / S-MOD-17 / S-MOD-18 cases green.
- [x] Confirm no untraced EARS rules from [design.md](./design.md) Test mapping (S-MOD-01 auth remains gap/optional; UI subtitle optional beyond contract tests).
- [x] `pnpm typecheck` passes (or project-equivalent typecheck).

**Apply run (2026-09-02):** `pnpm exec vitest run src/server/modules/moduleCatalog.test.ts` — 8 passed.
Auth unchanged (`requireExtractorPlus`). Full `pnpm typecheck` still fails on pre-existing `declaredSymbolsInfo` errors unrelated to this change; no new errors in touched catalog/search files.

---

## Verify (REVIEW_GUIDE §1.5)

```
Verify: 2026-09-02
Human sign-off (cursory): Keerthan K — 2026-09-02
Outcome: pass with waivers (see below); prerequisite gap — no PR / no recorded tiered code review yet
```

### Agent checklist

| Check | Result |
| --- | --- |
| Every `tasks.md` item done or deferred | **pass** — Red / Implementation / Apply-time Verify all `[x]` |
| Mapped tests green; every `MUST NOT` has negative test or waiver | **pass** — `moduleCatalog.test.ts` 8/8 green (re-run 2026-09-02). S-MOD-18 negative: no invented “Unclassified”. **Waiver (design):** S-MOD-01 Extractor+ auth remains gap/optional. **Waiver (design):** UI muted subtitle optional beyond contract tests. |
| `design.md` decisions reflected in shipped code | **pass** — see teach-back |
| `proposal.md` PRD delta matches shipped | **pass** — R-MOD-16/17/18 shipped; non-goals respected (Modules table / workspace org / filters / auth / de-locale untouched) |
| Teach-back without relying only on git diff | **pass** — see below |

### Teach-back (shipped rules)

- **R-MOD-16 / S-MOD-16:** Search hits expose hierarchy `faculty` / `subjectArea`; catalog table shows muted subtitle under the title when either is present.
- **R-MOD-17 / S-MOD-17:** Matches sort faculty → subjectArea → title (case-insensitive) → `moduleId` via bare `localeCompare`; null org compares as `""`.
- **R-MOD-18 / S-MOD-18:** Missing hierarchy org → `null`; no invented labels; search does not open per-module JSON for org.
- **S-MOD-01 / S-MOD-13:** `searchModuleDescriptions` still `requireExtractorPlus` then `searchModules`.

### Waivers / gaps (human-owned)

1. **Prerequisite:** Apply artifacts still uncommitted on `metadata`; no open PR; no recorded tiered code review — Verify normally runs after that gate.
2. **Full `pnpm typecheck`:** still fails on pre-existing `declaredSymbolsInfo` (out of blast radius); no new errors in touched files.
3. **S-MOD-01 auth test:** design Test mapping gap — accepted for v1.
4. **UI subtitle unit/E2E:** design optional — not added.

<!-- After cursory human sign-off: Archive —
     fold deltas into canonical specs and move this set to
     /specs/changes/archive/YYYY-MM-DD-catalog-search-faculty-subject-area/. -->
