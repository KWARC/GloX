# Tasks: Module description catalog duplicates

> **Layer:** *do* — atomic Apply checklist only. **Do not add new requirements here** — trace each
> step to `proposal.md` or `design.md`. Copy from `_TEMPLATE/` into `/specs/changes/`.
>
> **Depends on:** Signed `clarify.md` and upstream-reviewed `design.md`. Red-phase test tasks run before implementation tasks.

---

## Red phase (tests must fail first)

- [x] Unit: duplicate-index map shape, symmetry, exact-wins, sort, omit empty keys — `scripts/moduleDescriptionDuplicates.test.ts` (or sibling). **design.md** data contract.
- [x] Unit: C2 suggestion among exact then near given a set of existing module ids. **design.md S-MOD-19**.
- [x] Unit: alias module TeX uses alias catalog title + canonical Inhalt/Lernziele (**proposal R-MOD-23**, **design.md S-MOD-23**).
- [x] Unit: bulk export file list includes both module TeX names and omits definition files for the alias (**proposal R-MOD-24**, **design.md S-MOD-24**).
- [x] Integration: `searchModuleDescriptions` attaches exact/near peers from a fixture index (**S-MOD-19**). **Waiver:** fixture catalog search + hint attach, not live Prisma `searchModuleDescriptions`.
- [x] Integration: mark fails when canonical row missing; fails when target is already a duplicate; succeeds then definition blocks gone and title kept (**S-MOD-20**). **Waiver:** unit tests of `planMarkDuplicate` / guards, not live Prisma.
- [x] Integration: statement update and create-definition fail WHILE duplicate (**S-MOD-21**). **Waiver:** `assertNotDuplicateDescription` unit, not live serverFn.
- [x] Integration: unmark clears FK and re-seeds three catalog fields (**S-MOD-22**). **Waiver:** policy/helpers, not live Prisma.
- [x] Integration: unauthenticated mark rejected (**R-MOD-13**). **Waiver:** Extractor+ helper unit, not live JWT.

## Implementation

- [x] Extend detector to emit envelope + `modules[id].{exact,near}` to `MODULES_DIR/duplicates.json`; assert symmetry. **clarify.md** JSON shape; **design.md** data contract.
- [x] Prisma: `ModuleDescription.duplicateOfModuleId` nullable FK; migrate. **clarify Q5**; **design.md** Prisma contract.
- [x] Load duplicate index from `MODULES_DIR` (missing file → empty hints). **design.md** Operations.
- [x] Enrich `searchModuleDescriptions` with peers + C2 using existing rows. **S-MOD-19**.
- [x] Catalog search UI U1 copy. **proposal R-MOD-19**; **clarify U1**. Shipped: peer counts + ids + extracted/duplicate icons (not collapsed “+N other catalog matches”).
- [x] Server mark/unmark + warning UI; create-then-mark if no row; FloDown delete aligned with reset. **S-MOD-20**, **S-MOD-22**.
- [x] Guard statement/definition/FloDown mutations WHEN `duplicateOfModuleId` set; hide workspace statement/definition panels. **S-MOD-21**. (Shipped hide, not disabled editors.)
- [x] Alias TeX composition + bulk zip includes alias module files only (no alias defs). **S-MOD-23**, **S-MOD-24**.
- [x] Dictionary term at Archive (not this task’s merge of canonical specs). **design.md** SDD delta intro.

## Verify

- [x] All mapped tests in **design.md Test mapping** run (except rows marked Gap).
- [x] `pnpm typecheck` and `pnpm test` green for touched files.
- [x] No untraced EARS from **proposal.md** PRD delta (R-MOD-19–24) without an SDD + test or Gap.

---

Verify: 2026-09-07
Human sign-off (cursory): requester (chat: `/opsx-archive`) — 2026-09-07
Outcome: pass | waivers: (1) several “integration” rows are guard/helper unit tests, not live Prisma/JWT serverFns — no harness; (2) R-MOD-15 still Gap; (3) S-MOD-21 UI is hide panels, not lock/disable editors; (4) U1 search copy is counts/ids/icons, not “suggestion title +N other catalog matches”

<!-- After human code review: run post-review Verify (REVIEW_GUIDE §1.5), then Archive —
     fold deltas into canonical specs and move this set to
     /specs/changes/archive/YYYY-MM-DD-<feature-slug>/. -->
