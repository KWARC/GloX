# Tasks: MathHub Use this — drop local declaration and retarget all current FTML

> **Layer:** *do* — atomic Apply checklist only. **Do not add new requirements here** — trace each
> step to `proposal.md` or `design.md`. Copy from `_TEMPLATE/` into `/specs/changes/`.
>
> **Depends on:** Signed `clarify.md` and upstream-reviewed `design.md`. Red-phase test tasks run before implementation tasks.

---

## Red phase (tests must fail first)

- [x] Failing unit tests (no Postgres harness — live-DB integration Gap in `design.md`):
      `src/server/ftml/replaceLocalSymbolWithMathHub.test.ts`,
      `src/lib/dedupCatalogDisplay.test.ts`. Stubs in matching modules; 8/8 fail on
      missing retarget/list/role/input/partition behavior (2026-09-18).
- [x] Human assertion audit (REVIEW_GUIDE §2.2) before Apply.

## Implementation

- [x] Replace `getFloDownBlocksReferencingSymbol` with `listLocalSymbolUriHits` (scan all
      FloDown blocks and ModuleDescription statement columns; no exclude-primary).
      (`design.md` S-SYM-14)
- [x] Replace `applySymbolPropagation` with `replaceLocalSymbolWithMathHub` (full-table re-scan in
      one transaction; `propagateUriInAst`; `removeDeclaredSymbol`; FloDown version rows; no ID
      list). (`design.md` S-SYM-03)
- [x] Wire Deduplication and Semantic Panel declared-definiendum Use this to list + replace only
      (drop primary `replaceSemantic` / `pendingPropagation` for this flow). (`design.md` S-SYM-16)
- [x] Symbol Replacement UI: include all hits; Discarded chip; module id + Title/Inhalt/Lernziele.
      (`proposal.md` R-SYM-21)
- [x] Deduplication page: unconfirmed first; section **Confirmed not a duplicate**. (`proposal.md`
      R-SYM-22)
- [x] `requireAdminOrCurator` (or equivalent) on list, replace, `confirmSymbolNotDuplicate`,
      `undoSymbolConfirmation`. (`design.md` S-SYM-15)
- [x] Leave `applyMathHubReplacement` unless the file rename makes a same-PR alias trivial.
      (`clarify.md` optional sibling rename)
- [x] Do not write `MarkReference`. (`proposal.md` Non-goals)

## Verify

- [x] All mapped tests in `design.md` Test mapping green (or documented live-DB waiver if the
      harness cannot hit Postgres).
- [x] No untraced EARS rules from `design.md` Test mapping.
- [x] Confirm replace no longer leaves `declaredSymbolsInfo` for the retargeted URI.

Verify (REVIEW_GUIDE §1.5): 2026-09-18. Mapped unit tests green; live-DB handler integration Gap
(no Postgres harness). Human cursory sign-off: requester (chat: archive) — 2026-09-18.

---

<!-- After human code review: run post-review Verify (REVIEW_GUIDE §1.5), then Archive —
     fold deltas into canonical specs and move this set to
     /specs/changes/archive/YYYY-MM-DD-<feature-slug>/. -->
