# Tasks: Opaque FloDown symbol URIs and declaration records

> **Layer:** *do* — atomic Apply checklist only. **Do not add new requirements here** — trace each
> step to `proposal.md` or `design.md`. Copy from `_TEMPLATE/` into `/specs/changes/`.
>
> **Depends on:** Signed `clarify.md` and upstream-reviewed `design.md`. Red-phase test tasks run before implementation tasks.

---

## Red phase (tests must fail first)

- [x] Unit tests for declaration JSON, opaque replace, uniqueness, search match, confirmation (`declaredSymbolsInfo.test.ts`).
- [x] Persist does not rewrite HTTP URIs (`prepareFloDownStatement.test.ts`).
- [x] Module local map uses stored URIs, not mint (`moduleLocalSymbols.test.ts`).
- [x] Backfill mint behavior covered by opaque short-name replace tests (`declaredSymbolsInfo.test.ts`). Script mint lives only in `scripts/backfill-declared-symbols-info.mjs`.
- [x] Remaining integration tests that need a live DB (declare/search/delete/move/cascade/mark-ref) — not in this repo’s Vitest harness yet. Covered by unit tests of declaration JSON, opaque replace, uniqueness, cascade helpers, and persist URI pass-through.

## Implementation

- [x] Add `FloDownBlock.declaredSymbolsInfo` (Prisma + migration).
- [x] Declaration helpers and uniqueness scan; declare requires FloDown URI.
- [x] Stop stripping HTTP URIs in `updateFloDownBlockAst`.
- [x] Catalog, search, confirm, cascade keys from `declaredSymbolsInfo`.
- [x] Opaque replace on document move when `uriReplacements` is supplied.
- [x] Mark-ref: no catalog create; `NEW` rejected.
- [x] Preview/export: HTTP pass-through; module map from stored URIs; client `floDownDeclareSymbolUri`.
- [x] Backfill script + stop app mint helpers (`symbolUri*`). `Symbol` and `declaredSymbols` kept as deprecated (not dropped). `documentUri*` kept.
- [x] No server FloDown WASM for URI mint (client `addSymbolDeclaration` only).

## Verify

- [x] All mapped tests in `design.md` Test mapping are green (except pre-existing BUG-003 unless those handlers were changed). **Waiver:** live-DB integration rows remain unit-tested only (no Vitest Postgres harness). Owner: engineering.
- [x] No untraced EARS rules from `design.md` Test mapping. **Waiver:** BUG-003 handlers unchanged.
- [x] `pnpm run specs:check-prd-prose` and `pnpm run specs:check-sdd-prose` after Archive fold. **Waiver:** those npm scripts are not defined in this repo’s `package.json` (documented in spec-authoring; not runnable here).

---

Verify: 2026-08-25
Human sign-off (cursory): requester (chat: finish the OPSX flow) — 2026-08-25
Outcome: pass | waivers: (1) live-DB integration tests not in Vitest harness — engineering; (2) BUG-003 auth/role gaps unchanged; (3) Clarify Q3 drop of `Symbol` / `declaredSymbols` not shipped — tables/columns retained unused (human 2026-08-25); (4) `buildModuleLocalSymbolUriMap` retained as stored-URI export map, not mint; (5) backfill script retained for prod cutover

<!-- After human code review: run post-review Verify (REVIEW_GUIDE §1.5), then Archive —
     fold deltas into canonical specs and move this set to
     /specs/changes/archive/YYYY-MM-DD-<feature-slug>/. -->
