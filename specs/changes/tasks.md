# Tasks: Module description catalog duplicates

> **Layer:** *do* — atomic Apply checklist only. **Do not add new requirements here** — trace each
> step to `proposal.md` or `design.md`. Copy from `_TEMPLATE/` into `/specs/changes/`.
>
> **Depends on:** Signed `clarify.md` and upstream-reviewed `design.md`. Red-phase test tasks run before implementation tasks.

---

## Red phase (tests must fail first)

- [ ] Unit: duplicate-index map shape, symmetry, exact-wins, sort, omit empty keys — `scripts/moduleDescriptionDuplicates.test.ts` (or sibling). **design.md** data contract. Run → FAIL until emitter exists.
- [ ] Unit: C2 suggestion among exact then near given a set of existing module ids. **design.md S-MOD-19**. Run → FAIL.
- [ ] Unit: alias module TeX uses alias catalog title + canonical Inhalt/Lernziele (**proposal R-MOD-23**, **design.md S-MOD-23**). Run → FAIL.
- [ ] Unit: bulk export file list includes both module TeX names and omits definition files for the alias (**proposal R-MOD-24**, **design.md S-MOD-24**). Run → FAIL.
- [ ] Integration: `searchModuleDescriptions` attaches exact/near peers from a fixture index (**S-MOD-19**). Run → FAIL.
- [ ] Integration: mark fails when canonical row missing; fails when target is already a duplicate; succeeds then definition blocks gone and title kept (**S-MOD-20**). Run → FAIL.
- [ ] Integration: statement update and create-definition fail WHILE duplicate (**S-MOD-21**). Run → FAIL.
- [ ] Integration: unmark clears FK and re-seeds three catalog fields (**S-MOD-22**). Run → FAIL.
- [ ] Integration: unauthenticated mark rejected (**R-MOD-13**). Run → FAIL.

## Implementation

- [ ] Extend detector to emit envelope + `modules[id].{exact,near}` to `MODULES_DIR/duplicates.json`; assert symmetry. **clarify.md** JSON shape; **design.md** data contract.
- [ ] Prisma: `ModuleDescription.duplicateOfModuleId` nullable FK; migrate. **clarify Q5**; **design.md** Prisma contract.
- [ ] Load duplicate index from `MODULES_DIR` (missing file → empty hints). **design.md** Operations.
- [ ] Enrich `searchModuleDescriptions` with peers + C2 using existing rows. **S-MOD-19**.
- [ ] Catalog search UI U1 copy. **proposal R-MOD-19**; **clarify U1**.
- [ ] Server mark/unmark + warning UI; create-then-mark if no row; FloDown delete aligned with reset. **S-MOD-20**, **S-MOD-22**.
- [ ] Guard statement/definition/FloDown mutations WHEN `duplicateOfModuleId` set; disable workspace editors. **S-MOD-21**.
- [ ] Alias TeX composition + bulk zip includes alias module files only (no alias defs). **S-MOD-23**, **S-MOD-24**.
- [ ] Dictionary term at Archive (not this task’s merge of canonical specs). **design.md** SDD delta intro.

## Verify

- [ ] All mapped tests in **design.md Test mapping** run (except rows marked Gap).
- [ ] `pnpm typecheck` and `pnpm test` green for touched files.
- [ ] No untraced EARS from **proposal.md** PRD delta (R-MOD-19–24) without an SDD + test or Gap.

---

<!-- After human code review: run post-review Verify (REVIEW_GUIDE §1.5), then Archive —
     fold deltas into canonical specs and move this set to
     /specs/changes/archive/YYYY-MM-DD-<feature-slug>/. -->
