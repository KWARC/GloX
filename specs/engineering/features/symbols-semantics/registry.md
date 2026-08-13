---
id: symbol-registry
featured: true
upstream:
  - symbols-semantics
compliance: []
code:
  - src/serverFns/symbol.server.ts
  - src/server/floDownBlockDeclaredSymbols.ts
  - src/serverFns/symbolDuplicate.server.ts
  - src/routes/symbols.tsx
  - src/routes/Deduplication.tsx
---

# SDD: Symbol registry

## Domain context

Owns local `Symbol` catalog creation via definienda, uniqueness, association tracking, guarded
deletion, and duplicate confirmation.

Out of scope:

- Symbol URI propagation across blocks — [`propagation.md`](./propagation.md)
- Catalog search / stemming — [`search.md`](./search.md)
- FloDown statement editing lifecycle — `flodown-blocks/lifecycle.md`

## Architecture boundaries

| Layer | Responsibility |
| --- | --- |
| `src/serverFns/symbol.server.ts` | Creates definienda, lists associations, and deletes unassociated Symbols. |
| `src/server/floDownBlockDeclaredSymbols.ts` | Upserts Symbol rows when declared names are added to a FloDown block. |
| `src/serverFns/symbolDuplicate.server.ts` | Sets or clears the Symbol confirmed flag and confirming user. |
| `src/routes/symbols.tsx` | Curator/Admin UI for the local Symbol registry. |
| `prisma/schema.prisma` `Symbol` | Enforces uniqueness on `(symbolName, futureRepo, filePath, fileName, language)`. |

## Data contracts

| Field | Notes |
| --- | --- |
| Unique key | `@@unique([symbolName, futureRepo, filePath, fileName, language])` |
| `hasConfirmed` / `confirmedById` | Deduplication confirmation |
| Association | Non-discarded FloDown block shares export identity and declares `symbolName` |

## Business rules

**S-SYM-01 (Event-Driven):** WHEN `createSymbolDefiniendum` succeeds with `symdecl: true`, the system
MUST upsert or link a Symbol at the FloDown block's export identity and MUST persist the definiendum
in the block statement with version history.

**Upstream:** R-SYM-01

**S-SYM-02 (Ubiquitous):** Symbol persistence MUST enforce uniqueness on
`(symbolName, futureRepo, filePath, fileName, language)` via the Prisma unique constraint and upsert
paths.

**Upstream:** R-SYM-02

**S-SYM-04 (Event-Driven):** WHEN `confirmSymbolNotDuplicate` succeeds, the system MUST set
`hasConfirmed` and `confirmedById` on the Symbol.

**Upstream:** R-SYM-04

**S-SYM-06 (Ubiquitous):** `deleteSymbolIfUnassociated` and Curator/Admin symbol-registry mutations that
destroy or confirm Symbols MUST reject Extractor-role callers (`requireAdminOrCurator` or equivalent).

**Upstream:** R-SYM-06 — **partially implemented** (see BUG-003: confirm/undo lack role gate).

**S-SYM-07 (Ubiquitous):** Symbol and symref mutation handlers MUST require an authenticated session.

**Upstream:** R-SYM-07 — **partially implemented** (see BUG-003: `undoSymbolConfirmation` and some
search/list handlers lack auth).

**S-SYM-08 (Event-Driven):** WHEN `deleteSymbolIfUnassociated` is called, IF
`associatedDefinitionCount > 0` for that Symbol, the system MUST reject the request.

**Upstream:** R-SYM-08

## Test mapping

| SDD rule | PRD rule | Test |
| --- | --- | --- |
| S-SYM-01 | R-SYM-01 | Gap |
| S-SYM-02 | R-SYM-02 | Gap |
| S-SYM-04 | R-SYM-04 | Gap |
| S-SYM-06 | R-SYM-06 | Gap |
| S-SYM-07 | R-SYM-07 | Gap |
| S-SYM-08 | R-SYM-08 | Gap |

## Implementation bugs

| ID | File(s) | Description |
| --- | --- | --- |
| BUG-003 | `symbolDuplicate.server.ts`, `SymbolPropagation.server.ts`, several list/search handlers | Role gates and/or auth missing relative to R-SYM-06/07; confirm and propagation rely on route UI, not server enforcement. |

## Related docs

- [`symbols-semantics.md`](../../../prds/domains/symbols-semantics.md)
- [`propagation.md`](./propagation.md)
- [`search.md`](./search.md)
- [`../flodown-blocks/lifecycle.md`](../flodown-blocks/lifecycle.md)
