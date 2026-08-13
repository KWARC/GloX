# Tasks: <feature-name>

> **Layer:** *do* — atomic Apply checklist only. **Do not add new requirements here** — trace each
> step to `proposal.md` or `design.md`. Copy from `_TEMPLATE/` into `/specs/changes/`.
>
> **Depends on:** Signed `clarify.md` and upstream-reviewed `design.md`. Red-phase test tasks run before implementation tasks.

---

## Red phase (tests must fail first)

- [ ] <!-- e.g. Add integration test for R-1 in design.md §Test mapping → run → confirm FAIL -->

## Implementation

- [ ] <!-- e.g. Step 1 — design.md §SDD delta rule R-2; touch `path/to/file.ts` -->

## Verify

<!-- Apply-time: confirm mapped tests run before handing off for human PR review. -->
- [ ] <!-- All mapped tests green; no untraced EARS rules from design.md Test mapping -->

---

<!-- After human code review: run post-review Verify (REVIEW_GUIDE §1.5), then Archive —
     fold deltas into canonical specs and move this set to
     /specs/changes/archive/YYYY-MM-DD-<feature-slug>/. -->
